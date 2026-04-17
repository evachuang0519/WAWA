import { ref } from 'vue'
import { bookingsApi } from '@/api/index.js'
import {
  saveTasks,
  loadCachedTasks,
  updateLocalTaskStatus,
  queueAction,
  getLastSyncTime
} from '@/db/offlineDb.js'
import { useOfflineStore } from '@/stores/offline.js'

const todayStr = new Date().toISOString().slice(0, 10)

/**
 * 駕駛任務 Composable（含離線支援）
 *
 * 線上：從 API 取得 → 存入 IndexedDB → 顯示
 * 離線：從 IndexedDB 讀取快取 → 顯示（標示上次同步時間）
 * 狀態更新：線上直接送出，離線加入 pendingActions 佇列
 */
export function useDriverTasks() {
  const tasks = ref([])
  const loading = ref(false)
  const updatingId = ref(null)
  const lastSyncLabel = ref('')
  const offlineStore = useOfflineStore()

  /** 嘗試取得 GPS 座標（最多等 5 秒）*/
  function getGps() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      const timer = setTimeout(() => resolve(null), 5000)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer)
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => { clearTimeout(timer); resolve(null) },
        { timeout: 4500, maximumAge: 30000 }
      )
    })
  }

  async function updateSyncLabel() {
    const t = await getLastSyncTime()
    if (!t) { lastSyncLabel.value = ''; return }
    const d = new Date(t)
    lastSyncLabel.value = `上次同步 ${d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`
  }

  /** 載入今日任務（線上從 API，離線從快取） */
  async function loadData() {
    loading.value = true
    try {
      if (offlineStore.isOnline) {
        await loadFromApi()
      } else {
        await loadFromCache()
      }
    } finally {
      loading.value = false
      await updateSyncLabel()
    }
  }

  async function loadFromApi() {
    try {
      let data = []
      try {
        const { tasksApi } = await import('@/api/index.js')
        const res = await tasksApi.today()
        const d = res.data
        data = Array.isArray(d) ? d : (d.tasks ?? d.data ?? [])
      } catch {
        const res = await bookingsApi.list({ date: todayStr })
        const d = res.data
        const all = Array.isArray(d) ? d : (d.bookings ?? d.data ?? [])
        data = all.filter(b => (b.service_date ?? b.date ?? '').startsWith(todayStr))
      }
      data = sortByTime(data)
      tasks.value = data
      await saveTasks(data)  // 存入 IndexedDB 供離線使用
    } catch {
      // API 失敗時也嘗試快取
      await loadFromCache()
    }
  }

  async function loadFromCache() {
    const cached = await loadCachedTasks()
    tasks.value = sortByTime(
      cached.filter(t => (t.service_date ?? t.date ?? '').startsWith(todayStr))
    )
  }

  function sortByTime(data) {
    return [...data].sort((a, b) =>
      (a.service_time ?? a.time ?? '').localeCompare(b.service_time ?? b.time ?? '')
    )
  }

  /** 更新任務狀態（線上直送，離線入佇列） */
  async function updateStatus(task, newStatus) {
    updatingId.value = task.id
    const gps = await getGps()

    try {
      if (offlineStore.isOnline) {
        // 線上：直接送 API
        try {
          const { tasksApi } = await import('@/api/index.js')
          await tasksApi.updateStatus(task.id, newStatus)
        } catch {
          await bookingsApi.update(task.id, { status: newStatus })
        }
      } else {
        // 離線：存入佇列，本地先更新
        await queueAction('UPDATE_STATUS', task.id, {
          status: newStatus,
          lat: gps?.lat ?? null,
          lng: gps?.lng ?? null,
          timestamp: new Date().toISOString()
        })
        await offlineStore.refreshPendingCount()
        offlineStore.showToast('warning', `已記錄「${newStatus}」，將於連線後同步`)
      }

      // 本地 UI 立即反映
      task.status = newStatus
      await updateLocalTaskStatus(task.id, newStatus)
    } catch (err) {
      offlineStore.showToast('error', err.response?.data?.message ?? '操作失敗')
    } finally {
      updatingId.value = null
    }
  }

  // 監聽同步完成事件，自動重新載入任務
  function setupRefreshListener() {
    const handler = () => loadData()
    window.addEventListener('ltc:tasks-refresh', handler)
    return () => window.removeEventListener('ltc:tasks-refresh', handler)
  }

  return {
    tasks,
    loading,
    updatingId,
    lastSyncLabel,
    loadData,
    updateStatus,
    setupRefreshListener
  }
}
