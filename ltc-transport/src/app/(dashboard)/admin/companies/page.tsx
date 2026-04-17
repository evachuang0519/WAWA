'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import { Plus, Phone, Users, Car, X, RefreshCw, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react'
import type { TransportCompany } from '@/types'

type Form = Omit<TransportCompany, 'id' | 'created_at' | 'service_areas'>
const EMPTY: Form = { name: '', short_name: '', address: '', phone: '', contact_name: '', contact_email: '', license_no: '', status: 'active' }

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<TransportCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('全部')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<TransportCompany | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/companies')
      const json = await res.json()
      setCompanies(json.data ?? [])
    } catch { setCompanies([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY); setShowModal(true) }
  function openEdit(co: TransportCompany) {
    setEditTarget(co)
    setForm({ name: co.name, short_name: co.short_name ?? '', address: co.address ?? '', phone: co.phone ?? '', contact_name: co.contact_name ?? '', contact_email: co.contact_email ?? '', license_no: co.license_no ?? '', status: co.status })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) { showToast('名稱為必填', false); return }
    setSaving(true)
    try {
      const url = editTarget ? `/api/companies/${editTarget.id}` : '/api/companies'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      showToast(editTarget ? '已更新' : '已新增', true)
      setShowModal(false)
      await load()
    } catch { showToast('儲存失敗', false) }
    setSaving(false)
  }

  const shown = filter === '全部' ? companies : companies.filter(c => c.status === (filter === '正常' ? 'active' : 'inactive'))
  const f = (k: keyof Form, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <TopBar title="車行管理" subtitle="管理所有合作運輸車行" />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold">{editTarget ? '編輯車行' : '新增車行'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: '車行名稱 *', key: 'name' as const, placeholder: '安心車行' },
                { label: '簡稱', key: 'short_name' as const, placeholder: '安心' },
                { label: '地址', key: 'address' as const, placeholder: '台中市...' },
                { label: '電話', key: 'phone' as const, placeholder: '04-11112222' },
                { label: '聯絡人', key: 'contact_name' as const, placeholder: '陳老闆' },
                { label: 'Email', key: 'contact_email' as const, placeholder: 'info@example.com' },
                { label: '營業執照號碼', key: 'license_no' as const, placeholder: '交通部核發字號' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500">{label}</label>
                  <input value={(form[key] as string) ?? ''} onChange={e => f(key, e.target.value)}
                    placeholder={placeholder}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500">狀態</label>
                <select value={form.status} onChange={e => f('status', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="active">正常</option>
                  <option value="inactive">停用</option>
                </select>
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
            {['全部', '正常', '停用'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${s === filter ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{s}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus size={15} />新增車行
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw size={20} className="animate-spin mr-2" />載入中…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.map(co => (
              <div key={co.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-lg">
                      {(co.short_name ?? co.name).charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{co.name}</p>
                      <p className="text-xs text-gray-400">簡稱：{co.short_name}</p>
                    </div>
                  </div>
                  <Badge value={co.status} />
                </div>
                <div className="space-y-1.5 mb-3">
                  {co.phone && <div className="flex items-center gap-2 text-xs text-gray-600"><Phone size={12} className="text-gray-400" />{co.phone}</div>}
                  {co.contact_name && <div className="flex items-center gap-2 text-xs text-gray-600"><Users size={12} className="text-gray-400" />聯絡人：{co.contact_name}</div>}
                  {co.license_no && <div className="flex items-center gap-2 text-xs text-gray-600"><Car size={12} className="text-gray-400" />執照：{co.license_no}</div>}
                </div>
                <button onClick={() => openEdit(co)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50">
                  <Edit2 size={11} />編輯
                </button>
              </div>
            ))}
            {shown.length === 0 && <div className="col-span-2 text-center py-16 text-gray-400">無符合條件的車行</div>}
          </div>
        )}
      </div>
    </div>
  )
}
