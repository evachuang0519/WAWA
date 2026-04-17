'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import { Plus, Phone, MapPin, Users, X, RefreshCw, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react'
import type { CareUnit } from '@/types'

type Form = Omit<CareUnit, 'id' | 'created_at'>
const EMPTY: Form = { name: '', short_name: '', address: '', phone: '', contact_name: '', contact_email: '', region: '', status: 'active' }

export default function CareUnitsPage() {
  const [units, setUnits] = useState<CareUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('全部')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<CareUnit | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/care-units')
      const json = await res.json()
      setUnits(json.data ?? [])
    } catch { setUnits([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY); setShowModal(true) }
  function openEdit(cu: CareUnit) {
    setEditTarget(cu)
    setForm({ name: cu.name, short_name: cu.short_name ?? '', address: cu.address ?? '', phone: cu.phone ?? '', contact_name: cu.contact_name ?? '', contact_email: cu.contact_email ?? '', region: cu.region ?? '', status: cu.status })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) { showToast('名稱為必填', false); return }
    setSaving(true)
    try {
      const url = editTarget ? `/api/care-units/${editTarget.id}` : '/api/care-units'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      showToast(editTarget ? '已更新' : '已新增', true)
      setShowModal(false)
      await load()
    } catch { showToast('儲存失敗', false) }
    setSaving(false)
  }

  const shown = filter === '全部' ? units : units.filter(u => u.status === (filter === '正常' ? 'active' : 'inactive'))
  const f = (k: keyof Form, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <TopBar title="長照單位管理" subtitle="管理所有合作長照與日照機構" />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold">{editTarget ? '編輯機構' : '新增機構'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: '機構全名 *', key: 'name' as const, placeholder: '照橙日照中心' },
                { label: '簡稱', key: 'short_name' as const, placeholder: '照橙' },
                { label: '地址', key: 'address' as const, placeholder: '台中市西區...' },
                { label: '電話', key: 'phone' as const, placeholder: '04-12345678' },
                { label: '聯絡人', key: 'contact_name' as const, placeholder: '王主任' },
                { label: 'Email', key: 'contact_email' as const, placeholder: 'care@example.com' },
                { label: '所在地區', key: 'region' as const, placeholder: '台中市' },
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
              <Plus size={15} />新增機構
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw size={20} className="animate-spin mr-2" />載入中…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {shown.map(cu => (
              <div key={cu.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-700 font-bold text-lg">
                      {(cu.short_name ?? cu.name).charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{cu.name}</p>
                      <p className="text-xs text-gray-400">{cu.short_name} · {cu.region}</p>
                    </div>
                  </div>
                  <Badge value={cu.status} />
                </div>
                <div className="space-y-2 mb-4">
                  {cu.phone && <div className="flex items-center gap-2 text-xs text-gray-600"><Phone size={12} className="text-gray-400" />{cu.phone}</div>}
                  {cu.address && <div className="flex items-center gap-2 text-xs text-gray-600"><MapPin size={12} className="text-gray-400" /><span className="truncate">{cu.address}</span></div>}
                  {cu.contact_name && <div className="flex items-center gap-2 text-xs text-gray-600"><Users size={12} className="text-gray-400" />聯絡人：{cu.contact_name}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(cu)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50">
                    <Edit2 size={11} />編輯
                  </button>
                </div>
              </div>
            ))}
            {shown.length === 0 && <div className="col-span-3 text-center py-16 text-gray-400">無符合條件的機構</div>}
          </div>
        )}
      </div>
    </div>
  )
}
