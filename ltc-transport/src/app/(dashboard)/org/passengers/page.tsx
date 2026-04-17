'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import { CARE_UNITS } from '@/lib/db'
import { Plus, Search, X, RefreshCw, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react'
import type { Passenger } from '@/types'

type PassengerForm = Omit<Passenger, 'id'>

const EMPTY_FORM: PassengerForm = {
  care_unit_id: CARE_UNITS[0]?.id ?? '',
  name: '',
  phone: '',
  emergency_contact: '',
  emergency_phone: '',
  home_address: '',
  pickup_address: '',
  dropoff_address: '',
  wheelchair: false,
  notes: '',
  status: 'active',
}

export default function PassengersPage() {
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Passenger | null>(null)
  const [form, setForm] = useState<PassengerForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/passengers')
      const json = await res.json()
      setPassengers(json.data ?? [])
    } catch { setPassengers([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(p: Passenger) {
    setEditTarget(p)
    setForm({
      care_unit_id: p.care_unit_id,
      name: p.name,
      phone: p.phone ?? '',
      emergency_contact: p.emergency_contact ?? '',
      emergency_phone: p.emergency_phone ?? '',
      home_address: p.home_address ?? '',
      pickup_address: p.pickup_address ?? '',
      dropoff_address: p.dropoff_address ?? '',
      wheelchair: p.wheelchair,
      notes: p.notes ?? '',
      status: p.status,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.care_unit_id) { showToast('姓名與機構為必填', false); return }
    setSaving(true)
    try {
      const url = editTarget ? `/api/passengers/${editTarget.id}` : '/api/passengers'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      showToast(editTarget ? '已更新' : '已新增', true)
      setShowModal(false)
      await load()
    } catch { showToast('儲存失敗', false) }
    setSaving(false)
  }

  const filtered = passengers.filter(p =>
    p.name.includes(search) || (p.phone ?? '').includes(search)
  )

  const f = (field: keyof PassengerForm, val: unknown) =>
    setForm(prev => ({ ...prev, [field]: val }))

  return (
    <div>
      <TopBar title="個案管理" subtitle="管理所有服務乘客資料" />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{editTarget ? '編輯個案' : '新增個案'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">所屬機構 *</label>
                <select value={form.care_unit_id} onChange={e => f('care_unit_id', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  {CARE_UNITS.map(cu => <option key={cu.id} value={cu.id}>{cu.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">姓名 *</label>
                  <input value={form.name} onChange={e => f('name', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="王小明" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">聯絡電話</label>
                  <input value={form.phone ?? ''} onChange={e => f('phone', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0912-345-678" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">緊急聯絡人</label>
                  <input value={form.emergency_contact ?? ''} onChange={e => f('emergency_contact', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">緊急聯絡電話</label>
                  <input value={form.emergency_phone ?? ''} onChange={e => f('emergency_phone', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">居住地址</label>
                <input value={form.home_address ?? ''} onChange={e => f('home_address', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">常用上車地址</label>
                <input value={form.pickup_address ?? ''} onChange={e => f('pickup_address', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">常用下車地址</label>
                <input value={form.dropoff_address ?? ''} onChange={e => f('dropoff_address', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.wheelchair} onChange={e => f('wheelchair', e.target.checked)}
                    className="w-4 h-4 accent-green-600" />
                  <span className="text-sm text-gray-700">需要輪椅無障礙車輛</span>
                </label>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mr-2">狀態</label>
                  <select value={form.status} onChange={e => f('status', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="active">正常</option>
                    <option value="suspended">停用</option>
                    <option value="discharged">出院</option>
                  </select>
                </div>
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
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64" placeholder="搜尋姓名、電話..." />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus size={15} />新增個案
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" />載入中…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(p => {
              const cu = CARE_UNITS.find(c => c.id === p.care_unit_id)
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{cu?.short_name}</p>
                      </div>
                    </div>
                    <Badge value={p.status} />
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex gap-2"><span className="w-16 shrink-0 font-medium text-gray-600">電話</span><span>{p.phone || '—'}</span></div>
                    <div className="flex gap-2"><span className="w-16 shrink-0 font-medium text-gray-600">上車地址</span><span className="truncate">{p.pickup_address || '—'}</span></div>
                    <div className="flex gap-2"><span className="w-16 shrink-0 font-medium text-gray-600">緊急聯絡</span><span>{p.emergency_contact || '—'}</span></div>
                  </div>
                  {p.wheelchair && <div className="mt-3 text-xs text-orange-600 font-medium flex items-center gap-1">♿ 需要輪椅無障礙車輛</div>}
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => openEdit(p)}
                      className="flex-1 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 flex items-center justify-center gap-1">
                      <Edit2 size={11} />編輯
                    </button>
                    <button className="flex-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">訂車紀錄</button>
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
