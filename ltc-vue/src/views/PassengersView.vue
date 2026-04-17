<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0"><i class="bi bi-people me-2 text-primary"></i>個案管理</h5>
      <button class="btn btn-primary btn-sm" @click="openNew">
        <i class="bi bi-plus-lg me-1"></i>新增個案
      </button>
    </div>

    <!-- Search -->
    <div class="mb-3">
      <div class="input-group" style="max-width:320px;">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input v-model="search" type="text" class="form-control" placeholder="搜尋姓名…" />
        <button v-if="search" class="btn btn-outline-secondary" @click="search=''">
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>姓名</th>
                <th>電話</th>
                <th>輪椅</th>
                <th>殘障等級</th>
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
              <tr v-else-if="filtered.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-4 d-block mb-1"></i>暫無資料
                </td>
              </tr>
              <tr v-for="p in filtered" :key="p.id">
                <td class="fw-semibold">{{ p.name }}</td>
                <td class="text-muted small">{{ p.phone ?? '—' }}</td>
                <td>
                  <i v-if="p.needs_wheelchair || p.needsWheelchair" class="bi bi-wheelchair text-info fs-5"></i>
                  <span v-else class="text-muted small">無</span>
                </td>
                <td>
                  <span v-if="p.disability_level ?? p.disabilityLevel" class="badge bg-info text-dark">
                    {{ p.disability_level ?? p.disabilityLevel }}
                  </span>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td><StatusBadge :status="p.status ?? 'active'" /></td>
                <td>
                  <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(p)">
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
    <div class="modal fade" id="passengerModal" tabindex="-1" ref="modalEl">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold">{{ editId ? '編輯個案' : '新增個案' }}</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">姓名 *</label>
                <input v-model="form.name" type="text" class="form-control" :class="{ 'is-invalid': v.name }" />
                <div class="invalid-feedback">請輸入姓名</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">電話</label>
                <input v-model="form.phone" type="tel" class="form-control" placeholder="09xx-xxx-xxx" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">身份證字號</label>
                <input v-model="form.id_number" type="text" class="form-control" placeholder="A123456789" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">出生日期</label>
                <input v-model="form.birth_date" type="date" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">殘障等級</label>
                <select v-model="form.disability_level" class="form-select">
                  <option value="">無</option>
                  <option value="輕度">輕度</option>
                  <option value="中度">中度</option>
                  <option value="重度">重度</option>
                  <option value="極重度">極重度</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">狀態</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">在籍</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
              <div class="col-12">
                <div class="form-check">
                  <input v-model="form.needs_wheelchair" type="checkbox" class="form-check-input" id="chkWheelchair" />
                  <label class="form-check-label" for="chkWheelchair">需要輪椅空間</label>
                </div>
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">常用地址</label>
                <input v-model="form.address" type="text" class="form-control" placeholder="居住地址" />
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">緊急聯絡人</label>
                <input v-model="form.emergency_contact" type="text" class="form-control" placeholder="姓名 / 電話" />
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">備註</label>
                <textarea v-model="form.notes" class="form-control" rows="2"></textarea>
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
import { ref, computed, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import { passengersApi } from '@/api/index.js'
import StatusBadge from '@/components/StatusBadge.vue'

const passengers = ref([])
const loading = ref(true)
const submitting = ref(false)
const search = ref('')
const editId = ref(null)
const form = ref(emptyForm())
const v = ref({})
const modalEl = ref(null)
let bsModal = null

function emptyForm() {
  return { name: '', phone: '', id_number: '', birth_date: '', disability_level: '', needs_wheelchair: false, address: '', emergency_contact: '', notes: '', status: 'active' }
}

onMounted(async () => {
  bsModal = new Modal(modalEl.value)
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const res = await passengersApi.list()
    const d = res.data
    passengers.value = Array.isArray(d) ? d : (d.passengers ?? d.data ?? [])
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  if (!search.value) return passengers.value
  const q = search.value.toLowerCase()
  return passengers.value.filter((p) => p.name?.toLowerCase().includes(q))
})

function openNew() {
  editId.value = null
  form.value = emptyForm()
  v.value = {}
  bsModal?.show()
}

function openEdit(p) {
  editId.value = p.id
  form.value = {
    name: p.name ?? '',
    phone: p.phone ?? '',
    id_number: p.id_number ?? p.idNumber ?? '',
    birth_date: p.birth_date ?? p.birthDate ?? '',
    disability_level: p.disability_level ?? p.disabilityLevel ?? '',
    needs_wheelchair: !!(p.needs_wheelchair ?? p.needsWheelchair),
    address: p.address ?? '',
    emergency_contact: p.emergency_contact ?? p.emergencyContact ?? '',
    notes: p.notes ?? '',
    status: p.status ?? 'active'
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
      await passengersApi.update(editId.value, form.value)
    } else {
      await passengersApi.create(form.value)
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
