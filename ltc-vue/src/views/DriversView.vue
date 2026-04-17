<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0"><i class="bi bi-person-badge me-2 text-primary"></i>駕駛管理</h5>
      <button class="btn btn-primary btn-sm" @click="openNew">
        <i class="bi bi-plus-lg me-1"></i>新增駕駛
      </button>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>姓名</th>
                <th>電話</th>
                <th>駕照到期</th>
                <th>健康證明到期</th>
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
              <tr v-else-if="drivers.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-4 d-block mb-1"></i>暫無資料
                </td>
              </tr>
              <tr v-for="d in drivers" :key="d.id">
                <td class="fw-semibold">{{ d.name }}</td>
                <td class="text-muted small">{{ d.phone ?? '—' }}</td>
                <td>
                  <ExpiryBadge :date="d.license_expiry ?? d.licenseExpiry" />
                </td>
                <td>
                  <ExpiryBadge :date="d.health_cert_expiry ?? d.healthCertExpiry" />
                </td>
                <td><StatusBadge :status="d.status ?? 'active'" /></td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" @click="openEdit(d)">
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
    <div class="modal fade" id="driverModal" tabindex="-1" ref="modalEl">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold">{{ editId ? '編輯駕駛' : '新增駕駛' }}</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label small fw-semibold">姓名 *</label>
                <input v-model="form.name" type="text" class="form-control" :class="{ 'is-invalid': v.name }" />
                <div class="invalid-feedback">請輸入姓名</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">電話</label>
                <input v-model="form.phone" type="tel" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">電子郵件</label>
                <input v-model="form.email" type="email" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">駕照到期日</label>
                <input v-model="form.license_expiry" type="date" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">健康證明到期日</label>
                <input v-model="form.health_cert_expiry" type="date" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">狀態</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">在職</option>
                  <option value="inactive">停用</option>
                  <option value="on_leave">休假</option>
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
import { driversApi } from '@/api/index.js'
import StatusBadge from '@/components/StatusBadge.vue'

// Inline ExpiryBadge component
const ExpiryBadge = defineComponent({
  props: { date: String },
  setup(props) {
    const cls = computed(() => {
      if (!props.date) return 'text-muted'
      const d = new Date(props.date)
      const now = new Date()
      const diff = (d - now) / (1000 * 60 * 60 * 24)
      if (diff < 0) return 'text-danger fw-semibold'
      if (diff <= 30) return 'text-warning fw-semibold'
      return 'text-success'
    })
    const icon = computed(() => {
      if (!props.date) return ''
      const d = new Date(props.date)
      const now = new Date()
      const diff = (d - now) / (1000 * 60 * 60 * 24)
      if (diff < 0) return 'bi bi-exclamation-triangle-fill me-1'
      if (diff <= 30) return 'bi bi-exclamation-circle me-1'
      return ''
    })
    return () => props.date
      ? h('span', { class: cls.value }, [
          icon.value ? h('i', { class: icon.value }) : null,
          new Date(props.date).toLocaleDateString('zh-TW')
        ])
      : h('span', { class: 'text-muted' }, '—')
  }
})

const drivers = ref([])
const loading = ref(true)
const submitting = ref(false)
const editId = ref(null)
const form = ref(emptyForm())
const v = ref({})
const modalEl = ref(null)
let bsModal = null

function emptyForm() {
  return { name: '', phone: '', email: '', license_expiry: '', health_cert_expiry: '', status: 'active' }
}

onMounted(async () => {
  bsModal = new Modal(modalEl.value)
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const res = await driversApi.list()
    const d = res.data
    drivers.value = Array.isArray(d) ? d : (d.drivers ?? d.data ?? [])
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

function openEdit(d) {
  editId.value = d.id
  form.value = {
    name: d.name ?? '',
    phone: d.phone ?? '',
    email: d.email ?? '',
    license_expiry: d.license_expiry ?? d.licenseExpiry ?? '',
    health_cert_expiry: d.health_cert_expiry ?? d.healthCertExpiry ?? '',
    status: d.status ?? 'active'
  }
  v.value = {}
  bsModal?.show()
}

function validate() {
  const errs = {}
  if (!form.value.name) errs.name = true
  v.value = errs
  return Object.keys(errs).length === 0
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    if (editId.value) {
      await driversApi.update(editId.value, form.value)
    } else {
      await driversApi.create(form.value)
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
