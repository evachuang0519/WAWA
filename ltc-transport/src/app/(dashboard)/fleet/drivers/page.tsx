'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import { TRANSPORT_COMPANIES } from '@/lib/db'
import { Plus, Phone, AlertTriangle, X, RefreshCw, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react'
import type { Driver } from '@/types'

type DriverForm = Omit<Driver, 'id'>
const EMPTY_FORM: DriverForm = {
  company_id: TRANSPORT_COMPANIES[0]?.id ?? '',
  name: '',
  phone: '',
  id_number: '',
  license_number: '',
  license_class: '職業小客',
  license_expiry: '',
  health_cert_expiry: '',
  status: 'active',
  notes: '',
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('全部')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Driver | null>(null)
  const [form, setForm] = useState<DriverForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/drivers')
      const json = await res.json()
      setDrivers(json.data ?? [])
    } catch { setDrivers([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setShowModal(true) }

  function openEdit(d: Driver) {
    setEditTarget(d)
    setForm({
      company_id: d.company_id, name: d.name, phone: d.phone ?? '',
      id_number: d.id_number ?? '', license_number: d.license_number ?? '',
      license_class: d.license_class ?? '', license_expiry: d.license_expiry ?? '',
      health_cert_expiry: d.health_cert_expiry ?? '', status: d.status, notes: d.notes ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.company_id) { showToast('姓名與車行為必填', false); return }
    setSaving(true)
    try {
      const url = editTarget ? `/api/drivers/${editTarget.id}` : '/api/drivers'
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
  const FILTER_MAP: Record<string, string | null> = { '全部': null, '正常': 'active', '請假': 'leave', '離職': 'resigned' }
  const shown = filter === '全部' ? drivers : drivers.filter(d => d.status === FILTER_MAP[filter])

  const f = (field: keyof DriverForm, val: unknown) => setForm(prev => ({ ...prev, [field]: val }))

  return (
    <div>
      <TopBar title="駕駛管理" subtitle="管理所有駕駛資料與證照狀態" />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{editTarget ? '編輯駕駛' : '新增駕駛'}</h2>
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
                  <label className="text-xs font-semibold text-gray-500">姓名 *</label>
                  <input value={form.name} onChange={e => f('name', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="張志明" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">聯絡電話</label>
                  <input value={form.phone ?? ''} onChange={e => f('phone', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0912-111-222" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">駕照號碼</label>
                  <input value={form.license_number ?? ''} onChange={e => f('license_number', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="A123456789" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">駕照類別</label>
                  <select value={form.license_class ?? ''} onChange={e => f('license_class', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option>職業小客</option>
                    <option>職業大客</option>
                    <option>普通小客</option>
                    <option>普通大客</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">駕照到期日</label>
                  <input type="date" value={form.license_expiry ?? ''} onChange={e => f('license_expiry', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">健檢到期日</label>
                  <input type="date" value={form.health_cert_expiry ?? ''} onChange={e => f('health_cert_expiry', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">狀態</label>
                <select value={form.status} onChange={e => f('status', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="active">正常</option>
                  <option value="leave">請假</option>
                  <option value="resigned">離職</option>
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
            {['全部', '正常', '請假', '離職'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${s === filter ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus size={15} />新增駕駛
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw size={20} className="animate-spin mr-2" />載入中…</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['姓名', '車行', '電話', '駕照號碼', '駕照到期', '健檢到期', '狀態', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">無符合條件的駕駛</td></tr>
                )}
                {shown.map(d => {
                  const company = TRANSPORT_COMPANIES.find(c => c.id === d.company_id)
                  const licExpiry = d.license_expiry ? new Date(d.license_expiry) : null
                  const healthExpiry = d.health_cert_expiry ? new Date(d.health_cert_expiry) : null
                  const licUrgent = licExpiry && (licExpiry.getTime() - now) < 90 * 86400000
                  const healthUrgent = healthExpiry && (healthExpiry.getTime() - now) < 90 * 86400000
                  return (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">{d.name.charAt(0)}</div>
                          <span className="font-medium text-gray-800">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{company?.short_name}</td>
                      <td className="px-4 py-3">
                        <a href={`tel:${d.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-green-600">
                          <Phone size={12} />{d.phone || '—'}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{d.license_number || '—'}<br /><span className="text-gray-400">{d.license_class}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {licUrgent && <AlertTriangle size={12} className="text-orange-500" />}
                          <span className={`text-xs ${licUrgent ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>{d.license_expiry || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {healthUrgent && <AlertTriangle size={12} className="text-orange-500" />}
                          <span className={`text-xs ${healthUrgent ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>{d.health_cert_expiry || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge value={d.status} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(d)} className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-0.5">
                          <Edit2 size={11} />編輯
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
