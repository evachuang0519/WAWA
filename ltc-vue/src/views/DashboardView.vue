<template>
  <div>
    <h5 class="fw-bold mb-4"><i class="bi bi-speedometer2 me-2 text-primary"></i>系統總覽</h5>

    <!-- KPI Cards -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-xl-3" v-for="kpi in kpiCards" :key="kpi.label">
        <div class="card kpi-card h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div
              class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              :class="kpi.bg"
              style="width:52px;height:52px;"
            >
              <i :class="kpi.icon + ' fs-4 ' + kpi.iconColor"></i>
            </div>
            <div>
              <div class="text-muted small">{{ kpi.label }}</div>
              <div class="fw-bold fs-4">
                <span v-if="statsLoading" class="spinner-border spinner-border-sm text-secondary"></span>
                <span v-else>{{ kpi.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Bookings Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3">
        <span class="fw-semibold">最近訂車紀錄</span>
        <span class="badge bg-light text-muted">最後 10 筆</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>日期</th>
                <th>個案姓名</th>
                <th>起點</th>
                <th>訖點</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="tableLoading">
                <td colspan="5" class="text-center py-4">
                  <div class="spinner-border text-primary spinner-border-sm"></div>
                  <span class="ms-2 text-muted">載入中…</span>
                </td>
              </tr>
              <tr v-else-if="recentBookings.length === 0">
                <td colspan="5" class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-4 d-block mb-1"></i>暫無資料
                </td>
              </tr>
              <tr v-for="b in recentBookings" :key="b.id">
                <td class="text-nowrap">{{ formatDate(b.service_date ?? b.date) }}</td>
                <td>{{ b.passenger_name ?? b.passengerName ?? '—' }}</td>
                <td class="text-muted small">{{ b.pickup_address ?? b.pickupAddress ?? '—' }}</td>
                <td class="text-muted small">{{ b.dropoff_address ?? b.dropoffAddress ?? '—' }}</td>
                <td><StatusBadge :status="b.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { bookingsApi } from '@/api/index.js'
import StatusBadge from '@/components/StatusBadge.vue'

const allBookings = ref([])
const statsLoading = ref(true)
const tableLoading = ref(true)

const todayStr = new Date().toISOString().slice(0, 10)

onMounted(async () => {
  try {
    const res = await bookingsApi.list({ limit: 100 })
    const data = res.data
    allBookings.value = Array.isArray(data) ? data : (data.bookings ?? data.data ?? [])
  } catch {
    allBookings.value = []
  } finally {
    statsLoading.value = false
    tableLoading.value = false
  }
})

const todayBookings = computed(() =>
  allBookings.value.filter((b) => {
    const d = b.service_date ?? b.date ?? ''
    return d.startsWith(todayStr)
  })
)

const kpiCards = computed(() => [
  {
    label: '今日行程',
    value: todayBookings.value.length,
    icon: 'bi bi-calendar-day',
    bg: 'bg-primary bg-opacity-10',
    iconColor: 'text-primary'
  },
  {
    label: '已完成',
    value: todayBookings.value.filter((b) => ['已完成', 'completed'].includes(b.status)).length,
    icon: 'bi bi-check-circle',
    bg: 'bg-success bg-opacity-10',
    iconColor: 'text-success'
  },
  {
    label: '待指派',
    value: todayBookings.value.filter((b) => ['待指派', 'pending'].includes(b.status)).length,
    icon: 'bi bi-hourglass-split',
    bg: 'bg-warning bg-opacity-10',
    iconColor: 'text-warning'
  },
  {
    label: '在線行程',
    value: todayBookings.value.filter((b) => ['進行中', 'in_progress'].includes(b.status)).length,
    icon: 'bi bi-truck',
    bg: 'bg-info bg-opacity-10',
    iconColor: 'text-info'
  }
])

const recentBookings = computed(() =>
  [...allBookings.value]
    .sort((a, b) => new Date(b.created_at ?? b.createdAt ?? 0) - new Date(a.created_at ?? a.createdAt ?? 0))
    .slice(0, 10)
)

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
}
</script>
