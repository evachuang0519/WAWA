<template>
  <div>
    <!-- 離線/同步提示橫幅 -->
    <OfflineBanner :lastSyncLabel="lastSyncLabel" />

    <div class="d-flex justify-content-between align-items-center mb-4 mt-3">
      <div>
        <h5 class="fw-bold mb-0">
          <i class="bi bi-list-task me-2 text-primary"></i>今日任務
        </h5>
        <small class="text-muted">{{ todayLabel }}</small>
      </div>
      <button class="btn btn-outline-primary btn-sm" @click="loadData" :disabled="loading">
        <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-arrow-clockwise me-1"></i>重新整理
      </button>
    </div>

    <!-- 離線快取提示 -->
    <div v-if="!offlineStore.isOnline && tasks.length > 0" class="alert alert-warning py-2 small mb-3">
      <i class="bi bi-clock-history me-1"></i>
      顯示離線快取資料{{ lastSyncLabel ? `（${lastSyncLabel}）` : '' }}，部分資訊可能未更新
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <div class="text-muted mt-2">載入中…</div>
    </div>

    <div v-else-if="tasks.length === 0" class="text-center py-5">
      <i class="bi bi-sun fs-1 text-warning d-block mb-3"></i>
      <h6 class="text-muted">今日暫無任務</h6>
      <p class="text-muted small mb-0">
        {{ offlineStore.isOnline ? '請稍後再查看或聯絡車隊管理員' : '目前離線，顯示最後快取資料' }}
      </p>
    </div>

    <div v-else class="row g-3">
      <div class="col-12 col-md-6 col-xl-4" v-for="task in tasks" :key="task.id">
        <div class="card task-card" :class="{ 'task-card--offline': task._pendingSync }">
          <div class="card-body">
            <!-- Header -->
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <div class="fw-bold fs-5">{{ task.service_time ?? task.time ?? '—' }}</div>
                <div class="text-muted small">{{ formatDate(task.service_date ?? task.date) }}</div>
              </div>
              <div class="d-flex flex-column align-items-end gap-1">
                <StatusBadge :status="task.status" />
                <!-- 待同步標示 -->
                <span v-if="task._pendingSync" class="badge bg-warning text-dark" style="font-size:0.65rem;">
                  <i class="bi bi-cloud-upload me-1"></i>待同步
                </span>
              </div>
            </div>

            <!-- Passenger -->
            <div class="d-flex align-items-center gap-2 mb-2">
              <div class="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0" style="width:36px;height:36px;">
                <i class="bi bi-person-fill text-primary"></i>
              </div>
              <div>
                <div class="fw-semibold">{{ task.passenger_name ?? task.passengerName ?? '—' }}</div>
                <div v-if="task.needs_wheelchair ?? task.needsWheelchair" class="text-info small">
                  <i class="bi bi-wheelchair me-1"></i>需輪椅空間
                </div>
              </div>
            </div>

            <!-- Route -->
            <div class="small text-muted mb-3">
              <div class="d-flex gap-2 align-items-start mb-1">
                <i class="bi bi-geo-alt-fill text-success mt-1 flex-shrink-0"></i>
                <span>{{ task.pickup_address ?? task.pickupAddress ?? '—' }}</span>
              </div>
              <div class="d-flex gap-2 align-items-start">
                <i class="bi bi-geo-fill text-danger mt-1 flex-shrink-0"></i>
                <span>{{ task.dropoff_address ?? task.dropoffAddress ?? '—' }}</span>
              </div>
            </div>

            <!-- Expandable details -->
            <div v-if="expanded.has(task.id)" class="border-top pt-2 mb-3 small text-muted">
              <div v-if="task.notes"><i class="bi bi-sticky me-1"></i>{{ task.notes }}</div>
              <div v-if="task.vehicle_plate ?? task.vehiclePlate">
                <i class="bi bi-truck me-1"></i>{{ task.vehicle_plate ?? task.vehiclePlate }}
              </div>
            </div>

            <!-- Action buttons -->
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-outline-secondary" @click="toggleExpand(task.id)">
                <i :class="expanded.has(task.id) ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
              </button>

              <a :href="mapsUrl(task)" target="_blank" class="btn btn-sm btn-outline-info" title="Google 地圖導航">
                <i class="bi bi-map"></i>
              </a>

              <button
                v-if="canStart(task.status)"
                class="btn btn-sm btn-warning flex-grow-1"
                @click="handleUpdateStatus(task, '進行中')"
                :disabled="updatingId === task.id"
              >
                <span v-if="updatingId === task.id" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-play-fill me-1"></i>開始接送
              </button>

              <button
                v-if="canComplete(task.status)"
                class="btn btn-sm btn-success flex-grow-1"
                @click="handleUpdateStatus(task, '已完成')"
                :disabled="updatingId === task.id"
              >
                <span v-if="updatingId === task.id" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-check-lg me-1"></i>完成任務
              </button>

              <span v-if="['已完成','completed'].includes(task.status)" class="text-success small d-flex align-items-center">
                <i class="bi bi-check-circle-fill me-1"></i>已完成
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'
import { useDriverTasks } from '@/composables/useDriverTasks.js'
import { useOfflineStore } from '@/stores/offline.js'
import { getPendingActions } from '@/db/offlineDb.js'

const offlineStore = useOfflineStore()
const {
  tasks, loading, updatingId, lastSyncLabel,
  loadData, updateStatus, setupRefreshListener
} = useDriverTasks()

const expanded = ref(new Set())
const todayLabel = new Date().toLocaleDateString('zh-TW', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
})

onMounted(async () => {
  offlineStore.init()
  await loadData()
  await markPendingTasks()
  // 監聽同步完成後重整
  const cleanup = setupRefreshListener()
  onUnmounted(() => {
    cleanup()
    offlineStore.destroy()
  })
})

/** 標記有待同步操作的任務 */
async function markPendingTasks() {
  const pending = await getPendingActions()
  const pendingIds = new Set(pending.map(a => a.taskId))
  tasks.value.forEach(t => {
    t._pendingSync = pendingIds.has(t.id)
  })
}

async function handleUpdateStatus(task, newStatus) {
  await updateStatus(task, newStatus)
  await markPendingTasks()
}

function toggleExpand(id) {
  const s = new Set(expanded.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expanded.value = s
}

function canStart(status) {
  return ['已指派', 'assigned', '待指派', 'pending'].includes(status)
}
function canComplete(status) {
  return ['進行中', 'in_progress'].includes(status)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
}

function mapsUrl(task) {
  const dest = encodeURIComponent(task.dropoff_address ?? task.dropoffAddress ?? '')
  const origin = encodeURIComponent(task.pickup_address ?? task.pickupAddress ?? '')
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`
}
</script>

<style scoped>
.task-card--offline {
  border-left: 3px solid #f59e0b !important;
}
</style>
