import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getPendingCount,
  getPendingActions,
  markActionSent,
  markActionFailed,
  clearSentActions,
  getLastSyncTime
} from '@/db/offlineDb.js'
import { bookingsApi } from '@/api/index.js'

export const useOfflineStore = defineStore('offline', () => {
  const isOnline = ref(navigator.onLine)
  const isSyncing = ref(false)
  const pendingCount = ref(0)
  const lastSyncAt = ref(null)
  const syncError = ref(null)
  // 通知訊息（同步結果）
  const toast = ref(null)  // { type: 'success'|'warning'|'error', message: string }

  // 初始化：監聽網路事件、載入元資料
  function init() {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    refreshPendingCount()
    getLastSyncTime().then(t => { lastSyncAt.value = t })
  }

  function destroy() {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }

  async function handleOnline() {
    isOnline.value = true
    showToast('success', '網路已恢復，開始同步…')
    await flushPendingActions()
  }

  function handleOffline() {
    isOnline.value = false
    showToast('warning', '已切換為離線模式，操作將於連線後同步')
  }

  async function refreshPendingCount() {
    pendingCount.value = await getPendingCount()
  }

  /** 將待同步佇列逐一送出 */
  async function flushPendingActions() {
    const actions = await getPendingActions()
    if (actions.length === 0) return

    isSyncing.value = true
    syncError.value = null
    let successCount = 0
    let failCount = 0

    for (const action of actions) {
      try {
        if (action.type === 'UPDATE_STATUS') {
          await bookingsApi.update(action.taskId, {
            status: action.payload.status
          })
        }
        await markActionSent(action.id)
        successCount++
      } catch (err) {
        await markActionFailed(action.id, err?.message ?? '同步失敗')
        failCount++
      }
    }

    await clearSentActions()
    await refreshPendingCount()
    isSyncing.value = false

    if (failCount === 0) {
      showToast('success', `同步完成，${successCount} 筆操作已上傳`)
    } else {
      showToast('warning', `同步部分完成：${successCount} 成功，${failCount} 失敗`)
      syncError.value = `${failCount} 筆操作同步失敗`
    }

    // 觸發任務重新載入事件
    window.dispatchEvent(new CustomEvent('ltc:tasks-refresh'))
  }

  function showToast(type, message) {
    toast.value = { type, message }
    setTimeout(() => { toast.value = null }, 4000)
  }

  const hasPending = computed(() => pendingCount.value > 0)

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    syncError,
    hasPending,
    toast,
    init,
    destroy,
    refreshPendingCount,
    flushPendingActions,
    showToast
  }
})
