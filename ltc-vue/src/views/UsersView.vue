<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0"><i class="bi bi-people-fill me-2 text-primary"></i>使用者管理</h5>
      <button class="btn btn-primary btn-sm" @click="openNew">
        <i class="bi bi-plus-lg me-1"></i>新增使用者
      </button>
    </div>

    <!-- Role filter -->
    <div class="mb-3 d-flex gap-2 flex-wrap">
      <button
        v-for="opt in roleOpts"
        :key="opt.value"
        class="btn btn-sm"
        :class="roleFilter === opt.value ? 'btn-primary' : 'btn-outline-secondary'"
        @click="roleFilter = opt.value"
      >{{ opt.label }}</button>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>姓名</th>
                <th>Email</th>
                <th>角色</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="text-center py-4">
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                  <span class="ms-2 text-muted">載入中…</span>
                </td>
              </tr>
              <tr v-else-if="filtered.length === 0">
                <td colspan="5" class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-4 d-block mb-1"></i>暫無資料
                </td>
              </tr>
              <tr v-for="u in filtered" :key="u.id">
                <td class="fw-semibold">{{ u.name }}</td>
                <td class="text-muted small">{{ u.email }}</td>
                <td>
                  <span class="badge" :class="auth.roleBadgeClass(u.role)">
                    {{ auth.roleLabel(u.role) }}
                  </span>
                </td>
                <td>
                  <span class="badge" :class="u.status === 'active' ? 'bg-success' : 'bg-secondary'">
                    {{ u.status === 'active' ? '啟用' : '停用' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(u)">
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
    <div class="modal fade" tabindex="-1" ref="modalEl">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold">{{ editId ? '編輯使用者' : '新增使用者' }}</h6>
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
                <label class="form-label small fw-semibold">Email *</label>
                <input v-model="form.email" type="email" class="form-control" :class="{ 'is-invalid': v.email }" :disabled="!!editId" />
                <div class="invalid-feedback">請輸入有效 Email</div>
              </div>
              <div class="col-md-6" v-if="!editId">
                <label class="form-label small fw-semibold">密碼 *</label>
                <input v-model="form.password" type="password" class="form-control" :class="{ 'is-invalid': v.password }" />
                <div class="invalid-feedback">請輸入密碼（至少 6 碼）</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">角色 *</label>
                <select v-model="form.role" class="form-select" :class="{ 'is-invalid': v.role }">
                  <option value="">請選擇</option>
                  <option value="system_admin">系統管理員</option>
                  <option value="org_admin">機構管理員</option>
                  <option value="fleet_admin">車隊管理員</option>
                  <option value="driver">駕駛</option>
                </select>
                <div class="invalid-feedback">請選擇角色</div>
              </div>
              <div class="col-md-6" v-if="editId">
                <label class="form-label small fw-semibold">狀態</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">啟用</option>
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
import { ref, computed, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import { usersApi } from '@/api/index.js'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()

const users = ref([])
const loading = ref(true)
const submitting = ref(false)
const editId = ref(null)
const roleFilter = ref('')
const form = ref(emptyForm())
const v = ref({})
const modalEl = ref(null)
let bsModal = null

const roleOpts = [
  { value: '', label: '全部' },
  { value: 'system_admin', label: '系統管理員' },
  { value: 'org_admin', label: '機構管理員' },
  { value: 'fleet_admin', label: '車隊管理員' },
  { value: 'driver', label: '駕駛' }
]

function emptyForm() {
  return { name: '', email: '', password: '', role: '', status: 'active' }
}

onMounted(async () => {
  bsModal = new Modal(modalEl.value)
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const res = await usersApi.list()
    const d = res.data
    users.value = Array.isArray(d) ? d : (d.data ?? [])
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  if (!roleFilter.value) return users.value
  return users.value.filter((u) => u.role === roleFilter.value)
})

function openNew() {
  editId.value = null
  form.value = emptyForm()
  v.value = {}
  bsModal?.show()
}

function openEdit(u) {
  editId.value = u.id
  form.value = { name: u.name ?? '', email: u.email ?? '', password: '', role: u.role ?? '', status: u.status ?? 'active' }
  v.value = {}
  bsModal?.show()
}

function validate() {
  const errs = {}
  if (!form.value.name) errs.name = true
  if (!form.value.email) errs.email = true
  if (!editId.value && form.value.password.length < 6) errs.password = true
  if (!form.value.role) errs.role = true
  v.value = errs
  return Object.keys(errs).length === 0
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    if (editId.value) {
      const payload = { name: form.value.name, role: form.value.role, status: form.value.status }
      await usersApi.update(editId.value, payload)
    } else {
      await usersApi.create(form.value)
    }
    bsModal?.hide()
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message ?? err.response?.data?.error ?? '操作失敗')
  } finally {
    submitting.value = false
  }
}
</script>
