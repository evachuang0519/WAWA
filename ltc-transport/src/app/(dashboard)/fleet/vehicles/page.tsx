'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import { TRANSPORT_COMPANIES } from '@/lib/db'
import { Plus, AlertTriangle, X, RefreshCw, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react'
import type { Vehicle } from '@/types'

const TYPE_LABEL: Record<string, string> = { sedan: '轎車', van: '廂型車', wheelchair_van: '無障礙車', bus: '巴士' }

type VehicleForm = Omit<Vehicle, 'id'>
const EMPTY_FORM: VehicleForm = {
  company_id: TRANSPORT_COMPANIES[0]?.id ?? '',
  plate_number: '',
  type: 'van',
  capacity: 6,
  wheelchair_slots: 0,
  brand: '',
  model: '',
  insurance_expiry: '',
  inspection_due: '',
  status: 'available',
  notes: '',
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('全部')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vehicles')
      const json = await res.json()
      setVehicles(json.data ?? [])
    } catch { setVehicles([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setShowModal(true) }

  function openEdit(v: Vehicle) {
    setEditTarget(v)
    setForm({
      company_id: v.company_id, plate_number: v.plate_number, type: v.type,
      capacity: v.capacity, wheelchair_slots: v.wheelchair_slots,
      brand: v.brand ?? '', model: v.model ?? '',
      insurance_expiry: v.insurance_expiry ?? '', inspection_due: v.inspection_due ?? '',
      status: v.status, notes: v.notes ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.plate_number || !form.company_id) { showToast('車牌與車行為必填', false); return }
    setSaving(true)
    try {
      const url = editTarget ? `/api/vehicles/${editTarget.id}` : '/api/vehicles'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      showToast(editTarget ? '已更新' : '已新增', true)
      setShowModal(false)
      await load()
    } catch { showToast('儲存失敗', false) }
    setSaving(false)
  }

  const now = Date.now()
  const FILTER_MAP: Record<string, string | null> = { '全部': null, '可用': 'available', '服務中': 'in_service', '維修中': 'maintenance' }
  const shown = filter === '全部' ? vehicles : vehicles.filter(v => v.status === FILTER_MAP[filter])

  const f = (field: keyof VehicleForm, val: unknown) => setForm(prev => ({ ...prev, [field]: val }))

  return (
    <div>
      <TopBar title="車輛管理" subtitle="管理所有車輛資料與狀態" />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{editTarget ? '編輯車輛' : '新增車輛'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">所屬車行 *</label>
                <select value={form.company_id} onChange={e => f('company_id', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  {TRANSPORT_COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">車牌號碼 *</label>
                  <input value={form.plate_number} onChange={e => f('plate_number', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="ABC-1234" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">車型</label>
                  <select value={form.type} onChange={e => f('type', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">品牌</label>
                  <input value={form.brand ?? ''} onChange={e => f('brand', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Toyota" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">型號</label>
                  <input value={form.model ?? ''} onChange={e => f('model', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Hiace" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">一般座位數</label>
                  <input type="number" min="1" max="20" value={form.capacity} onChange={e => f('capacity', Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">輪椅席位</label>
                  <input type="number" min="0" max="4" value={form.wheelchair_slots} onChange={e => f('wheelchair_slots', Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">保險到期日</label>
                  <input type="date" value={form.insurance_expiry ?? ''} onChange={e => f('insurance_expiry', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">驗車到期日</label>
                  <input type="date" value={form.inspection_due ?? ''} onChange={e => f('inspection_due', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">狀態</label>
                <select value={form.status} onChange={e => f('status', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="available">可用</option>
                  <option value="in_service">服務中</option>
                  <option value="maintenance">維修中</option>
                  <option value="retired">報廢</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">備註</label>
                <textarea rows={2} value={form.notes ?? ''} onChange={e => f('notes', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <RefreshCw size={14} className="animate-spin" />}{editTarget ? '儲存' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['全部', '可用', '服務中', '維修中'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${s === filter ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus size={15} />新增車輛
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw size={20} className="animate-spin mr-2" />載入中…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {shown.map(v => {
              const company = TRANSPORT_COMPANIES.find(c => c.id === v.company_id)
              const insExpiry = v.insurance_expiry ? new Date(v.insurance_expiry) : null
              const inspExpiry = v.inspection_due ? new Date(v.inspection_due) : null
              const insUrgent = insExpiry && (insExpiry.getTime() - now) < 60 * 86400000
              const inspUrgent = inspExpiry && (inspExpiry.getTime() - now) < 30 * 86400000
              return (
                <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{v.plate_number}</p>
                      <p className="text-xs text-gray-500">{company?.short_name} · {TYPE_LABEL[v.type]} · {v.brand} {v.model}</p>
                    </div>
                    <Badge value={v.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-gray-800">{v.capacity}</p>
                      <p className="text-xs text-gray-400">一般座位</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-orange-700">{v.wheelchair_slots}</p>
                      <p className="text-xs text-orange-400">輪椅席位</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex items-center justify-between p-2 rounded-lg ${insUrgent ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <span className="text-xs text-gray-600">保險到期</span>
                      <div className="flex items-center gap-1">
                        {insUrgent && <AlertTriangle size={12} className="text-red-500" />}
                        <span className={`text-xs font-medium ${insUrgent ? 'text-red-600' : 'text-gray-700'}`}>{v.insurance_expiry || '—'}</span>
                      </div>
                    </div>
                    <div className={`flex items-center justify-between p-2 rounded-lg ${inspUrgent ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                      <span className="text-xs text-gray-600">驗車到期</span>
                      <div className="flex items-center gap-1">
                        {inspUrgent && <AlertTriangle size={12} className="text-yellow-500" />}
                        <span className={`text-xs font-medium ${inspUrgent ? 'text-yellow-700' : 'text-gray-700'}`}>{v.inspection_due || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => openEdit(v)}
                      className="flex-1 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 flex items-center justify-center gap-1">
                      <Edit2 size={11} />編輯
                    </button>
                    <button className="flex-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">服務紀錄</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
