<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0"><i class="bi bi-truck me-2 text-primary"></i>車行管理</h5>
      <button v-if="isAdmin" class="btn btn-primary btn-sm" @click="openNew">
        <i class="bi bi-plus-lg me-1"></i>新增車行
      </button>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>車行名稱</th>
                <th>聯絡人</th>
                <th>電話</th>
                <th>地址</th>
                <th v-if="isAdmin">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="isAdmin ? 5 : 4" class="text-center py-4">
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                  <span class="ms-2 text-muted">載入中…</span>
                </td>
              </tr>
              <tr v-else-if="companies.length === 0">
                <td :colspan="isAdmin ? 5 : 4" class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-4 d-block mb-1"></i>暫無資料
                </td>
              </tr>
              <tr v-for="c in companies" :key="c.id">
                <td class="fw-semibold">{{ c.name }}</td>
                <td class="text-muted small">{{ c.contact_person ?? c.contactPerson ?? '—' }}</td>
                <td class="text-muted small">{{ c.phone ?? '—' }}</td>
                <td class="text-muted small">{{ c.address ?? '—' }}</td>
                <td v-if="isAdmin">
                  <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(c)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="remove(c)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal fade" tabindex="-1" ref="modalEl">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold">{{ editId ? '編輯車行' : '新增車行' }}</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label small fw-semibold">車行名稱 *</label>
                <input v-model="form.name" type="text" class="form-control" :class="{ 'is-invalid': v.name }" />
                <div class="invalid-feedback">請輸入車行名稱</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">聯絡人</label>
                <input v-model="form.contact_person" type="text" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">電話</label>
                <input v-model="form.phone" type="tel" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">地址</label>
                <input v-model="form.address" type="text" class="form-control" />
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
import { companiesApi } from '@/api/index.js'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.role === 'system_admin')

const companies = ref([])
const loading = ref(true)
const submitting = ref(false)
const editId = ref(null)
const form = ref(emptyForm())
const v = ref({})
const modalEl = ref(null)
let bsModal = null

function emptyForm() {
  return { name: '', contact_person: '', phone: '', address: '', notes: '' }
}

onMounted(async () => {
  bsModal = new Modal(modalEl.value)
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const res = await companiesApi.list()
    const d = res.data
    companies.value = Array.isArray(d) ? d : (d.data ?? [])
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

function openEdit(c) {
  editId.value = c.id
  form.value = {
    name: c.name ?? '',
    contact_person: c.contact_person ?? c.contactPerson ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    notes: c.notes ?? ''
  }
  v.value = {}
  bsModal?.show()
}

async function remove(c) {
  if (!confirm(`確定要刪除「${c.name}」？`)) return
  try {
    await companiesApi.delete(c.id)
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message ?? '刪除失敗')
  }
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
      await companiesApi.update(editId.value, form.value)
    } else {
      await companiesApi.create(form.value)
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
