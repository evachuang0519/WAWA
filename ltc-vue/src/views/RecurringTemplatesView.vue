<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0"><i class="bi bi-arrow-repeat me-2 text-primary"></i>定期範本</h5>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-success btn-sm" @click="openGenerate">
          <i class="bi bi-calendar-plus me-1"></i>批次產生訂車
        </button>
        <button class="btn btn-primary btn-sm" @click="openNew">
          <i class="bi bi-plus-lg me-1"></i>新增範本
        </button>
      </div>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>個案</th>
                <th>星期</th>
                <th>時間</th>
                <th>方向</th>
                <th>輪椅</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="text-center py-4">
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                  <span class="ms-2 text-muted">載入中…</span>
                </td>
              </tr>
              <tr v-else-if="templates.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">
                  <i class="bi bi-inbox fs-4 d-block mb-1"></i>暫無定期範本
                </td>
              </tr>
              <tr v-for="t in templates" :key="t.id">
                <td class="fw-semibold">{{ t.passenger?.name ?? t.passenger_id }}</td>
                <td>{{ dayLabel(t.day_of_week) }}</td>
                <td class="text-nowrap">{{ t.service_time }}</td>
                <td>
                  <span class="badge" :class="t.direction === 'to_center' ? 'bg-info text-dark' : 'bg-warning text-dark'">
                    {{ t.direction === 'to_center' ? '去程' : '返程' }}
                  </span>
                </td>
                <td>
                  <i v-if="t.wheelchair" class="bi bi-wheelchair text-info fs-5"></i>
                  <span v-else class="text-muted small">無</span>
                </td>
                <td>
                  <span class="badge" :class="t.is_active ? 'bg-success' : 'bg-secondary'">
                    {{ t.is_active ? '啟用' : '停用' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(t)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="remove(t)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Edit/New Modal -->
    <div class="modal fade" tabindex="-1" ref="modalEl">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold">{{ editId ? '編輯範本' : '新增範本' }}</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">個案 ID *</label>
                <input v-model="form.passenger_id" type="text" class="form-control" :class="{ 'is-invalid': v.passenger_id }" placeholder="個案 UUID" />
                <div class="invalid-feedback">請輸入個案 ID</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">星期 *</label>
                <select v-model.number="form.day_of_week" class="form-select">
                  <option :value="0">週日</option>
                  <option :value="1">週一</option>
                  <option :value="2">週二</option>
                  <option :value="3">週三</option>
                  <option :value="4">週四</option>
                  <option :value="5">週五</option>
                  <option :value="6">週六</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">服務時間 *</label>
                <input v-model="form.service_time" type="time" class="form-control" :class="{ 'is-invalid': v.service_time }" />
                <div class="invalid-feedback">請選擇時間</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">方向 *</label>
                <select v-model="form.direction" class="form-select">
                  <option value="to_center">去程（家→中心）</option>
                  <option value="from_center">返程（中心→家）</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">接送地址</label>
                <input v-model="form.pickup_address" type="text" class="form-control" placeholder="接乘地址" />
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">目的地址</label>
                <input v-model="form.dropoff_address" type="text" class="form-control" placeholder="送達地址" />
              </div>
              <div class="col-md-6">
                <div class="form-check mt-2">
                  <input v-model="form.wheelchair" type="checkbox" class="form-check-input" id="chkWheelchair" />
                  <label class="form-check-label" for="chkWheelchair">需要輪椅空間</label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-check mt-2">
                  <input v-model="form.is_active" type="checkbox" class="form-check-input" id="chkActive" />
                  <label class="form-check-label" for="chkActive">啟用</label>
                </div>
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

    <!-- Generate Modal -->
    <div class="modal fade" tabindex="-1" ref="genModalEl">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold">批次產生訂車</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small">依據所有啟用中的定期範本，為指定日期範圍批次產生訂車紀錄。</p>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">開始日期 *</label>
                <input v-model="genForm.start_date" type="date" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">結束日期 *</label>
                <input v-model="genForm.end_date" type="date" class="form-control" />
              </div>
            </div>
            <div v-if="genResult" class="alert mt-3" :class="genResult.error ? 'alert-danger' : 'alert-success'">
              {{ genResult.message }}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
            <button type="button" class="btn btn-success" @click="generate" :disabled="generating">
              <span v-if="generating" class="spinner-border spinner-border-sm me-1"></span>
              產生訂車
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import { recurringTemplatesApi } from '@/api/index.js'

const templates = ref([])
const loading = ref(true)
const submitting = ref(false)
const generating = ref(false)
const editId = ref(null)
const form = ref(emptyForm())
const v = ref({})
const genForm = ref({ start_date: '', end_date: '' })
const genResult = ref(null)
const modalEl = ref(null)
const genModalEl = ref(null)
let bsModal = null
let bsGenModal = null

const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
function dayLabel(d) { return DAY_LABELS[d] ?? d }

function emptyForm() {
  return {
    passenger_id: '', day_of_week: 1, service_time: '08:00',
    direction: 'to_center', pickup_address: '', dropoff_address: '',
    wheelchair: false, is_active: true, notes: ''
  }
}

onMounted(async () => {
  bsModal = new Modal(modalEl.value)
  bsGenModal = new Modal(genModalEl.value)
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const res = await recurringTemplatesApi.list()
    const d = res.data
    templates.value = Array.isArray(d) ? d : (d.data ?? [])
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

function openEdit(t) {
  editId.value = t.id
  form.value = {
    passenger_id: t.passenger_id ?? '',
    day_of_week: t.day_of_week ?? 1,
    service_time: t.service_time ?? '08:00',
    direction: t.direction ?? 'to_center',
    pickup_address: t.pickup_address ?? '',
    dropoff_address: t.dropoff_address ?? '',
    wheelchair: !!(t.wheelchair),
    is_active: t.is_active !== false,
    notes: t.notes ?? ''
  }
  v.value = {}
  bsModal?.show()
}

function openGenerate() {
  const today = new Date().toISOString().slice(0, 10)
  genForm.value = { start_date: today, end_date: today }
  genResult.value = null
  bsGenModal?.show()
}

async function remove(t) {
  if (!confirm('確定要刪除此定期範本？')) return
  try {
    await recurringTemplatesApi.delete(t.id)
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message ?? '刪除失敗')
  }
}

function validate() {
  const errs = {}
  if (!form.value.passenger_id) errs.passenger_id = true
  if (!form.value.service_time) errs.service_time = true
  v.value = errs
  return Object.keys(errs).length === 0
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    if (editId.value) {
      await recurringTemplatesApi.update(editId.value, form.value)
    } else {
      await recurringTemplatesApi.create(form.value)
    }
    bsModal?.hide()
    await loadData()
  } catch (err) {
    alert(err.response?.data?.message ?? '操作失敗')
  } finally {
    submitting.value = false
  }
}

async function generate() {
  if (!genForm.value.start_date || !genForm.value.end_date) {
    alert('請選擇日期範圍')
    return
  }
  generating.value = true
  genResult.value = null
  try {
    const res = await recurringTemplatesApi.generate(genForm.value)
    const d = res.data
    genResult.value = { message: d.message ?? `成功產生 ${d.count ?? 0} 筆訂車`, error: false }
    await loadData()
  } catch (err) {
    genResult.value = { message: err.response?.data?.message ?? '產生失敗', error: true }
  } finally {
    generating.value = false
  }
}
</script>
