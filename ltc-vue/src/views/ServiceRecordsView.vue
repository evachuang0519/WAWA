<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0"><i class="bi bi-journal-text me-2 text-primary"></i>服務紀錄</h5>
    </div>

    <!-- Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>單號</th>
                <th>日期</th>
                <th>時間</th>
                <th>起點</th>
                <th>訖點</th>
                <th>距離 (km)</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="text-center py-4">
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                  <span class="ms-2 text-muted">載入中…</span>
                </td>
              </tr>
              <tr v-else-if="records.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-4 d-block mb-1"></i>暫無服務紀錄
                </td>
              </tr>
              <tr v-for="r in records" :key="r.id">
                <td class="text-muted small font-monospace">{{ r.order_number ?? '—' }}</td>
                <td class="text-nowrap">{{ formatDate(r.service_date) }}</td>
                <td class="text-nowrap">{{ r.service_time ?? '—' }}</td>
                <td class="text-muted small">{{ r.pickup_address ?? '—' }}</td>
                <td class="text-muted small">{{ r.dropoff_location ?? r.dropoff_address ?? '—' }}</td>
                <td>{{ r.distance_km != null ? r.distance_km : '—' }}</td>
                <td><StatusBadge :status="r.status ?? '已完成'" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { serviceRecordsApi } from '@/api/index.js'
import StatusBadge from '@/components/StatusBadge.vue'

const records = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await serviceRecordsApi.list()
    const d = res.data
    records.value = Array.isArray(d) ? d : (d.data ?? [])
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
})

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>
