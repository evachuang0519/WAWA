<template>
  <div>
    <h5 class="fw-bold mb-4"><i class="bi bi-diagram-3 me-2 text-primary"></i>任務指派</h5>

    <div class="row g-3">
      <!-- Left: Unassigned bookings -->
      <div class="col-lg-5">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3">
            <span class="fw-semibold">待指派行程</span>
            <span class="badge bg-warning text-dark">{{ unassigned.length }}</span>
          </div>
          <div class="card-body p-2" style="max-height:65vh;overflow-y:auto;">
            <div v-if="loadingBookings" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary"></div>
              <div class="text-muted small mt-2">載入中…</div>
            </div>
            <div v-else-if="unassigned.length === 0" class="text-center py-4 text-muted">
              <i class="bi bi-check-circle fs-3 text-success d-block mb-2"></i>
              所有行程已指派
            </div>
            <div
              v-for="b in unassigned"
              :key="b.id"
              class="card mb-2 cursor-pointer border-2"
              :class="selectedBooking?.id === b.id ? 'border-primary' : 'border-light'"
              style="cursor:pointer;"
              @click="selectBooking(b)"
            >
              <div class="card-body py-2 px-3">
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <span class="fw-semibold small">{{ b.passenger_name ?? b.passengerName ?? '—' }}</span>
                  <StatusBadge :status="b.status" />
                </div>
                <div class="text-muted small">
                  <i class="bi bi-calendar3 me-1"></i>{{ formatDateTime(b.service_date ?? b.date, b.service_time ?? b.time) }}
                </div>
                <div class="text-muted small mt-1">
                  <i class="bi bi-geo-alt text-success me-1"></i>{{ b.pickup_address ?? b.pickupAddress ?? '—' }}
                </div>
                <div class="text-muted small">
                  <i class="bi bi-geo text-danger me-1"></i>{{ b.dropoff_address ?? b.dropoffAddress ?? '—' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Assignment form + assigned list -->
      <div class="col-lg-7">
        <!-- Assignment form -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-white border-bottom py-3">
            <span class="fw-semibold">指派設定</span>
            <span v-if="selectedBooking" class="text-primary small ms-2">
              — {{ selectedBooking.passenger_name ?? selectedBooking.passengerName }}
            </span>
          </div>
          <div class="card-body">
            <div v-if="!selectedBooking" class="text-center py-3 text-muted">
              <i class="bi bi-arrow-left-circle fs-3 d-block mb-2"></i>
              請從左側選擇待指派行程
            </div>
            <div v-else class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">駕駛 *</label>
                <select v-model="assignForm.driver_id" class="form-select" :class="{ 'is-invalid': av.driver_id }">
                  <option value="">請選擇駕駛</option>
                  <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
                </select>
                <div class="invalid-feedback">請選擇駕駛</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">車輛 *</label>
                <select v-model="assignForm.vehicle_id" class="form-select" :class="{ 'is-invalid': av.vehicle_id }">
                  <option value="">請選擇車輛</option>
                  <option v-for="veh in vehicles" :key="veh.id" :value="veh.id">
                    {{ veh.plate_number ?? veh.plateNumber }} ({{ veh.vehicle_type ?? veh.vehicleType }})
                  </option>
                </select>
                <div class="invalid-feedback">請選擇車輛</div>
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">備註</label>
                <input v-model="assignForm.notes" type="text" class="form-control" placeholder="指派備註" />
              </div>
              <div class="col-12">
                <button class="btn btn-primary" @click="submitAssign" :disabled="submitting">
                  <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-check2 me-1"></i>
                  確認指派
                </button>
                <button class="btn btn-outline-secondary ms-2" @click="selectedBooking = null">
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Already assigned -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3">
            <span class="fw-semibold">已指派行程</span>
            <span class="badge bg-primary">{{ assigned.length }}</span>
          </div>
          <div class="card-body p-0" style="max-height:30vh;overflow-y:auto;">
            <div v-if="assigned.length === 0" class="text-center py-3 text-muted small">暫無已指派行程</div>
            <div v-for="b in assigned" :key="b.id" class="border-bottom px-3 py-2">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <span class="fw-semibold small">{{ b.passenger_name ?? b.passengerName ?? '—' }}</span>
                  <span class="text-muted small ms-2">{{ formatDateTime(b.service_date ?? b.date, b.service_time ?? b.time) }}</span>
                </div>
                <StatusBadge :status="b.status" />
              </div>
              <div class="text-muted small mt-1" v-if="b.driver_name ?? b.driverName">
                <i class="bi bi-person-badge me-1"></i>{{ b.driver_name ?? b.driverName }}
                <span v-if="b.vehicle_plate ?? b.vehiclePlate" class="ms-2">
                  <i class="bi bi-truck me-1"></i>{{ b.vehicle_plate ?? b.vehiclePlate }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { bookingsApi, driversApi, vehiclesApi, assignmentsApi } from '@/api/index.js'
import StatusBadge from '@/components/StatusBadge.vue'

const bookings = ref([])
const drivers = ref([])
const vehicles = ref([])
const loadingBookings = ref(true)
const submitting = ref(false)
const selectedBooking = ref(null)
const assignForm = ref({ driver_id: '', vehicle_id: '', notes: '' })
const av = ref({})

const unassigned = computed(() =>
  bookings.value.filter((b) => ['待指派', 'pending'].includes(b.status))
)
const assigned = computed(() =>
  bookings.value.filter((b) => !['待指派', 'pending', '取消', 'cancelled'].includes(b.status))
)

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loadingBookings.value = true
  try {
    const [bRes, dRes, vRes] = await Promise.all([
      bookingsApi.list(),
      driversApi.list({ status: 'active' }),
      vehiclesApi.list({ status: 'available' })
    ])
    const bd = bRes.data
    bookings.value = Array.isArray(bd) ? bd : (bd.bookings ?? bd.data ?? [])
    const dd = dRes.data
    drivers.value = Array.isArray(dd) ? dd : (dd.drivers ?? dd.data ?? [])
    const vd = vRes.data
    vehicles.value = Array.isArray(vd) ? vd : (vd.vehicles ?? vd.data ?? [])
  } finally {
    loadingBookings.value = false
  }
}

function selectBooking(b) {
  selectedBooking.value = b
  assignForm.value = { driver_id: '', vehicle_id: '', notes: '' }
  av.value = {}
}

function validate() {
  const errs = {}
  if (!assignForm.value.driver_id) errs.driver_id = true
  if (!assignForm.value.vehicle_id) errs.vehicle_id = true
  av.value = errs
  return Object.keys(errs).length === 0
}

async function submitAssign() {
  if (!validate()) return
  submitting.value = true
  try {
    await assignmentsApi.create({
      booking_id: selectedBooking.value.id,
      driver_id: assignForm.value.driver_id,
      vehicle_id: assignForm.value.vehicle_id,
      notes: assignForm.value.notes
    })
    selectedBooking.value = null
    await loadAll()
  } catch (err) {
    // Fallback: try updating booking status directly
    try {
      await bookingsApi.update(selectedBooking.value.id, {
        status: '已指派',
        driver_id: assignForm.value.driver_id,
        vehicle_id: assignForm.value.vehicle_id
      })
      selectedBooking.value = null
      await loadAll()
    } catch {
      alert(err.response?.data?.message ?? '指派失敗')
    }
  } finally {
    submitting.value = false
  }
}

function formatDateTime(date, time) {
  if (!date) return '—'
  const d = new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
  return time ? `${d} ${time}` : d
}
</script>
