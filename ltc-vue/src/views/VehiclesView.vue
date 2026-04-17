<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0"><i class="bi bi-truck me-2 text-primary"></i>車輛管理</h5>
      <button class="btn btn-primary btn-sm" @click="openNew">
        <i class="bi bi-plus-lg me-1"></i>新增車輛
      </button>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>車牌</th>
                <th>型別</th>
                <th>容量</th>
                <th>輪椅格</th>
                <th>保險到期</th>
                <th>定檢到期</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="8" class="text-center py-4">
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                  <span class="ms-2 text-muted">載入中…</span>
                </td>
              </tr>
              <tr v-else-if="vehicles.length === 0">
                <td colspan="8" class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-4 d-block mb-1"></i>暫無資料
                </td>
              </tr>
              <tr v-for="veh in vehicles" :key="veh.id">
                <td class="fw-semibold font-monospace">{{ veh.plate_number ?? veh.plateNumber }}</td>
                <td>{{ veh.vehicle_type ?? veh.vehicleType ?? '—' }}</td>
                <td class="text-center">{{ veh.capacity ?? '—' }}</td>
                <td class="text-center">
                  <i class="bi bi-wheelchair text-info me-1"></i>{{ veh.wheelchair_spaces ?? veh.wheelchairSpaces ?? 0 }}
                </td>
                <td><ExpiryText :date="veh.insurance_expiry ?? veh.insuranceExpiry" /></td>
                <td><ExpiryText :date="veh.inspection_expiry ?? veh.inspectionExpiry" /></td>
                <td><StatusBadge :status="veh.status ?? 'available'" /></td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" @click="openEdit(veh)">
                    <i class="bi bi-pencil"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal fade" id="vehicleModal" tabindex="-1" ref="modalEl">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold">{{ editId ? '編輯車輛' : '新增車輛' }}</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">車牌號碼 *</label>
                <input v-model="form.plate_number" type="text" class="form-control" :class="{ 'is-invalid': v.plate_number }" placeholder="ABC-1234" />
                <div class="invalid-feedback">請輸入車牌</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">車型</label>
                <select v-model="form.vehicle_type" class="form-select">
                  <option value="sedan">轎車</option>
                  <option value="van">廂型車</option>
                  <option value="accessible_van">無障礙廂型車</option>
                  <option value="bus">小巴</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">乘客容量</label>
                <input v-model.number="form.capacity" type="number" class="form-control" min="1" max="20" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">輪椅格數</label>
                <input v-model.number="form.wheelchair_spaces" type="number" class="form-control" min="0" max="5" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">保險到期日</label>
                <input v-model="form.insurance_expiry" type="date" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">定檢到期日</label>
                <input v-model="form.inspection_expiry" type="date" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">狀態</label>
                <select v-model="form.status" class="form-select">
                  <option value="available">可用</option>
                  <option value="in_use">使用中</option>
                  <option value="maintenance">維修中</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" @click="submit" :disabled="submitting">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
              {{ editId ? '儲存' : '新增' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineComponent, h, computed } from 'vue'
import { Modal } from 'bootstrap'
import { vehiclesApi } from '@/api/index.js'
import StatusBadge from '@/components/StatusBadge.vue'

// Inline expiry text
const ExpiryText = defineComponent({
  props: { date: String },
  setup(props) {
    const cls = computed(() => {
      if (!props.date) return 'text-muted'
      const diff = (new Date(props.date) - new Date()) / 86400000
      if (diff < 0) return 'text-danger fw-semibold'
      if (diff <= 30) return 'text-warning fw-semibold'
      return ''
    })
    const icon = computed(() => {
      if (!props.date) return null
      const diff = (new Date(props.date) - new Date()) / 86400000
      if (diff < 0) return 'bi bi-exclamation-triangle-fill me-1'
      if (diff <= 30) return 'bi bi-exclamation-circle me-1'
      return null
    })
    return () => props.date
      ? h('span', { class: cls.value }, [
          icon.value ? h('i', { class: icon.value }) : null,
          new Date(props.date).toLocaleDateString('zh-TW')
        ])
      : h('span', { class: 'text-muted' }, '—')
  }
})

const vehicles = ref([])
const loading = ref(true)
const submitting = ref(false)
const editId = ref(null)
const form = ref(emptyForm())
const v = ref({})
const modalEl = ref(null)
let bsModal = null

function emptyForm() {
  return { plate_number: '', vehicle_type: 'van', capacity: 5, wheelchair_spaces: 0, insurance_expiry: '', inspection_expiry: '', status: 'available' }
}

onMounted(async () => {
  bsModal = new Modal(modalEl.value)
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const res = await vehiclesApi.list()
    const d = res.data
    vehicles.value = Array.isArray(d) ? d : (d.vehicles ?? d.data ?? [])
  } finally {
    loading.value = false
  }
}

function openNew() {
  editId.value = null
  form.value = emptyForm()
  v.value = {}
  bsModal?.show()
}

function openEdit(veh) {
  editId.value = veh.id
  form.value = {
    plate_number: veh.plate_number ?? veh.plateNumber ?? '',
    vehicle_type: veh.vehicle_type ?? veh.vehicleType ?? 'van',
    capacity: veh.capacity ?? 5,
    wheelchair_spaces: veh.wheelchair_spaces ?? veh.wheelchairSpaces ?? 0,
    insurance_expiry: veh.insurance_expiry ?? veh.insuranceExpiry ?? '',
    inspection_expiry: veh.inspection_expiry ?? veh.inspectionExpiry ?? '',
    status: veh.status ?? 'available'
  }
  v.value = {}
  bsModal?.show()
}

function validate() {
  const errs = {}
  if (!form.value.plate_number) errs.plate_number = true
  v.value = errs
  return Object.keys(errs).length === 0
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    if (editId.value) {
      await vehiclesApi.update(editId.value, form.value)
    } else {
      await vehiclesApi.create(form.value)
    }
    bsModal?.hide()
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message ?? '操作失敗')
  } finally {
    submitting.value = false
  }
}
</script>
