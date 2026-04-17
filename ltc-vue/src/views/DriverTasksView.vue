<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h5 class="fw-bold mb-0"><i class="bi bi-list-task me-2 text-primary"></i>今日任務</h5>
        <small class="text-muted">{{ todayLabel }}</small>
      </div>
      <button class="btn btn-outline-primary btn-sm" @click="loadData">
        <i class="bi bi-arrow-clockwise me-1"></i>重新整理
      </button>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <div class="text-muted mt-2">載入中…</div>
    </div>

    <div v-else-if="tasks.length === 0" class="text-center py-5">
      <i class="bi bi-sun fs-1 text-warning d-block mb-3"></i>
      <h6 class="text-muted">今日暫無任務</h6>
      <p class="text-muted small">請稍後再查看或聯絡車隊管理員</p>
    </div>

    <div v-else class="row g-3">
      <div class="col-12 col-md-6 col-xl-4" v-for="task in tasks" :key="task.id">
        <div class="card task-card">
          <div class="card-body">
            <!-- Header -->
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <div class="fw-bold fs-5">{{ task.service_time ?? task.time ?? '—' }}</div>
                <div class="text-muted small">{{ formatDate(task.service_date ?? task.date) }}</div>
              </div>
              <StatusBadge :status="task.status" />
            </div>

            <!-- Passenger -->
            <div class="d-flex align-items-center gap-2 mb-2">
              <div class="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style="width:36px;height:36px;">
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
              <div v-if="task.notes">
                <i class="bi bi-sticky me-1"></i>{{ task.notes }}
              </div>
              <div v-if="task.vehicle_plate ?? task.vehiclePlate">
                <i class="bi bi-truck me-1"></i>{{ task.vehicle_plate ?? task.vehiclePlate }}
              </div>
            </div>

            <!-- Action buttons -->
            <div class="d-flex gap-2 flex-wrap">
              <!-- Toggle details -->
              <button class="btn btn-sm btn-outline-secondary" @click="toggleExpand(task.id)">
                <i :class="expanded.has(task.id) ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
              </button>

              <!-- Google Maps -->
              <a
                :href="mapsUrl(task)"
                target="_blank"
                class="btn btn-sm btn-outline-info"
                title="Google 地圖導航"
              >
                <i class="bi bi-map"></i>
              </a>

              <!-- Start -->
              <button
                v-if="canStart(task.status)"
                class="btn btn-sm btn-warning flex-grow-1"
                @click="updateStatus(task, '進行中')"
                :disabled="updatingId === task.id"
              >
                <span v-if="updatingId === task.id" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-play-fill me-1"></i>開始接送
              </button>

              <!-- Complete -->
              <button
                v-if="canComplete(task.status)"
                class="btn btn-sm btn-success flex-grow-1"
                @click="updateStatus(task, '已完成')"
                :disabled="updatingId === task.id"
              >
                <span v-if="updatingId === task.id" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-check-lg me-1"></i>完成任務
              </button>

              <!-- Done indicator -->
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
import { ref, computed, onMounted } from 'vue'
import { bookingsApi } from '@/api/index.js'
import StatusBadge from '@/components/StatusBadge.vue'

const tasks = ref([])
const loading = ref(true)
const updatingId = ref(null)
const expanded = ref(new Set())

const todayStr = new Date().toISOString().slice(0, 10)
const todayLabel = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    // Try dedicated tasks endpoint first, fallback to bookings
    let data = []
    try {
      const res = await import('@/api/index.js').then((m) => m.tasksApi.today())
      const d = res.data
      data = Array.isArray(d) ? d : (d.tasks ?? d.data ?? [])
    } catch {
      const res = await bookingsApi.list({ date: todayStr })
      const d = res.data
      const all = Array.isArray(d) ? d : (d.bookings ?? d.data ?? [])
      data = all.filter((b) => {
        const dateStr = b.service_date ?? b.date ?? ''
        return dateStr.startsWith(todayStr)
      })
    }
    // Sort by service_time
    tasks.value = data.sort((a, b) => {
      const ta = a.service_time ?? a.time ?? ''
      const tb = b.service_time ?? b.time ?? ''
      return ta.localeCompare(tb)
    })
  } finally {
    loading.value = false
  }
}

function toggleExpand(id) {
  const s = new Set(expanded.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expanded.value = s
}

function canStart(status) {
  return ['已指派', 'assigned', '待指派', 'pending'].includes(status)
}

function canComplete(status) {
  return ['進行中', 'in_progress'].includes(status)
}

async function updateStatus(task, newStatus) {
  updatingId.value = task.id
  try {
    // Try tasks endpoint
    try {
      const { tasksApi } = await import('@/api/index.js')
      await tasksApi.updateStatus(task.id, newStatus)
    } catch {
      await bookingsApi.update(task.id, { status: newStatus })
    }
    task.status = newStatus
  } catch (err) {
    alert(err.response?.data?.message ?? '更新失敗')
  } finally {
    updatingId.value = null
  }
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
