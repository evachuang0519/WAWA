<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0"><i class="bi bi-calendar-check me-2 text-primary"></i>訂車管理</h5>
      <button class="btn btn-primary btn-sm" @click="openNew">
        <i class="bi bi-plus-lg me-1"></i>新增訂車
      </button>
    </div>

    <!-- Status filter tabs -->
    <div class="mb-3">
      <ul class="nav nav-pills gap-1 flex-wrap">
        <li class="nav-item" v-for="tab in tabs" :key="tab.value">
          <button
            class="nav-link py-1 px-3 small"
            :class="{ active: activeTab === tab.value }"
            @click="activeTab = tab.value; currentPage = 1"
          >
            {{ tab.label }}
            <span class="badge ms-1 rounded-pill" :class="activeTab === tab.value ? 'bg-white text-primary' : 'bg-secondary'">
              {{ tabCount(tab.value) }}
            </span>
          </button>
        </li>
      </ul>
    </div>

    <!-- Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>日期</th>
                <th>時間</th>
                <th>個案姓名</th>
                <th>起訖</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center py-4">
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                  <span class="ms-2 text-muted">載入中…</span>
                </td>
              </tr>
              <tr v-else-if="pagedBookings.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-4 d-block mb-1"></i>暫無資料
                </td>
              </tr>
              <tr v-for="b in pagedBookings" :key="b.id">
                <td class="text-nowrap">{{ formatDate(b.service_date ?? b.date) }}</td>
                <td class="text-nowrap text-muted small">{{ b.service_time ?? b.time ?? '—' }}</td>
                <td>{{ b.passenger_name ?? b.passengerName ?? '—' }}</td>
                <td class="small">
                  <div class="text-muted"><i class="bi bi-geo-alt text-success"></i> {{ b.pickup_address ?? b.pickupAddress ?? '—' }}</div>
                  <div class="text-muted"><i class="bi bi-geo text-danger"></i> {{ b.dropoff_address ?? b.dropoffAddress ?? '—' }}</div>
                </td>
                <td><StatusBadge :status="b.status" /></td>
                <td>
                  <button class="btn btn-sm btn-outline-danger" @click="cancelBooking(b)" :disabled="['已完成','completed','取消','cancelled'].includes(b.status)">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div class="card-footer bg-white d-flex justify-content-between align-items-center py-2" v-if="totalPages > 1">
        <small class="text-muted">共 {{ filteredBookings.length }} 筆</small>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="currentPage--">‹</button>
            </li>
            <li
              class="page-item"
              v-for="p in totalPages"
              :key="p"
              :class="{ active: currentPage === p }"
            >
              <button class="page-link" @click="currentPage = p">{{ p }}</button>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button class="page-link" @click="currentPage++">›</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- New Booking Modal -->
    <div class="modal fade" id="newBookingModal" tabindex="-1" ref="modalEl">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold">新增訂車</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">服務日期 *</label>
                <input v-model="form.service_date" type="date" class="form-control" :class="{ 'is-invalid': v.service_date }" />
                <div class="invalid-feedback">請選擇日期</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">服務時間 *</label>
                <input v-model="form.service_time" type="time" class="form-control" :class="{ 'is-invalid': v.service_time }" />
                <div class="invalid-feedback">請選擇時間</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">個案 *</label>
                <select v-model="form.passenger_id" class="form-select" :class="{ 'is-invalid': v.passenger_id }">
                  <option value="">請選擇個案</option>
                  <option v-for="p in passengers" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <div class="invalid-feedback">請選擇個案</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">方向</label>
                <select v-model="form.direction" class="form-select">
                  <option value="to_hospital">往醫療機構</option>
                  <option value="to_home">返家</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">起點地址 *</label>
                <input v-model="form.pickup_address" type="text" class="form-control" :class="{ 'is-invalid': v.pickup_address }" placeholder="起點地址" />
                <div class="invalid-feedback">請輸入起點地址</div>
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">訖點地址 *</label>
                <input v-model="form.dropoff_address" type="text" class="form-control" :class="{ 'is-invalid': v.dropoff_address }" placeholder="訖點地址" />
                <div class="invalid-feedback">請輸入訖點地址</div>
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">備註</label>
                <textarea v-model="form.notes" class="form-control" rows="2" placeholder="備註事項"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" @click="submitBooking" :disabled="submitting">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
              確認新增
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import { bookingsApi, passengersApi } from '@/api/index.js'
import StatusBadge from '@/components/StatusBadge.vue'

const bookings = ref([])
const passengers = ref([])
const loading = ref(true)
const submitting = ref(false)
const activeTab = ref('全部')
const currentPage = ref(1)
const pageSize = 15
const modalEl = ref(null)
let bsModal = null

const tabs = [
  { label: '全部', value: '全部' },
  { label: '待指派', value: '待指派' },
  { label: '已指派', value: '已指派' },
  { label: '進行中', value: '進行中' },
  { label: '已完成', value: '已完成' },
  { label: '取消', value: '取消' }
]

const statusMap = { 待指派: 'pending', 已指派: 'assigned', 進行中: 'in_progress', 已完成: 'completed', 取消: 'cancelled' }

function normalizeStatus(s) {
  const rev = { pending: '待指派', assigned: '已指派', in_progress: '進行中', completed: '已完成', cancelled: '取消' }
  return rev[s] ?? s
}

const form = ref(emptyForm())
const v = ref({})

function emptyForm() {
  return { service_date: '', service_time: '', passenger_id: '', direction: 'to_hospital', pickup_address: '', dropoff_address: '', notes: '' }
}

onMounted(async () => {
  await loadData()
  bsModal = new Modal(modalEl.value)
})

async function loadData() {
  loading.value = true
  try {
    const [bRes, pRes] = await Promise.all([bookingsApi.list(), passengersApi.list()])
    const bd = bRes.data
    bookings.value = Array.isArray(bd) ? bd : (bd.bookings ?? bd.data ?? [])
    const pd = pRes.data
    passengers.value = Array.isArray(pd) ? pd : (pd.passengers ?? pd.data ?? [])
  } finally {
    loading.value = false
  }
}

function tabCount(tab) {
  if (tab === '全部') return bookings.value.length
  return bookings.value.filter((b) => normalizeStatus(b.status) === tab).length
}

const filteredBookings = computed(() => {
  if (activeTab.value === '全部') return bookings.value
  return bookings.value.filter((b) => normalizeStatus(b.status) === activeTab.value)
})

const totalPages = computed(() => Math.ceil(filteredBookings.value.length / pageSize))

const pagedBookings = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredBookings.value.slice(start, start + pageSize)
})

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function openNew() {
  form.value = emptyForm()
  v.value = {}
  bsModal?.show()
}

function validate() {
  const errs = {}
  if (!form.value.service_date) errs.service_date = true
  if (!form.value.service_time) errs.service_time = true
  if (!form.value.passenger_id) errs.passenger_id = true
  if (!form.value.pickup_address) errs.pickup_address = true
  if (!form.value.dropoff_address) errs.dropoff_address = true
  v.value = errs
  return Object.keys(errs).length === 0
}

async function submitBooking() {
  if (!validate()) return
  submitting.value = true
  try {
    await bookingsApi.create(form.value)
    bsModal?.hide()
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message ?? '新增失敗')
  } finally {
    submitting.value = false
  }
}

async function cancelBooking(b) {
  if (!confirm(`確定取消 ${b.passenger_name ?? b.passengerName ?? ''} 的訂車？`)) return
  try {
    await bookingsApi.delete(b.id)
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message ?? '取消失敗')
  }
}
</script>
