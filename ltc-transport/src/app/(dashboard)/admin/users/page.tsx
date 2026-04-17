'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Plus, Shield, Building2, Truck, User, X, RefreshCw, CheckCircle2, AlertCircle, Edit2, KeyRound } from 'lucide-react'
import type { UserRole } from '@/types'

interface UserRow { id: string; name: string; email: string; role: UserRole; org_id?: string; org_type?: string; status: string; last_login?: string }
interface Form { name: string; email: string; password: string; role: UserRole; org_id: string; org_type: string; status: string }

const EMPTY: Form = { name: '', email: '', password: '', role: 'viewer', org_id: '', org_type: '', status: 'active' }

const ROLE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  system_admin: { label: '系統管理者', color: 'bg-red-100 text-red-700', icon: <Shield size={12} /> },
  org_admin:    { label: '機構管理員', color: 'bg-green-100 text-green-700', icon: <Building2 size={12} /> },
  fleet_admin:  { label: '車行管理員', color: 'bg-blue-100 text-blue-700', icon: <Truck size={12} /> },
  driver:       { label: '駕駛', color: 'bg-purple-100 text-purple-700', icon: <User size={12} /> },
  viewer:       { label: '查閱者', color: 'bg-gray-100 text-gray-600', icon: <User size={12} /> },
}

const ROLE_FILTERS = ['全部', '系統管理者', '機構管理員', '車行管理員', '駕駛']
const ROLE_MAP: Record<string, UserRole | undefined> = {
  '全部': undefined, '系統管理者': 'system_admin', '機構管理員': 'org_admin',
  '車行管理員': 'fleet_admin', '駕駛': 'driver',
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('全部')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      setUsers(json.data ?? [])
    } catch { setUsers([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY); setShowModal(true) }
  function openEdit(u: UserRow) {
    setEditTarget(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, org_id: u.org_id ?? '', org_type: u.org_type ?? '', status: u.status })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.email) { showToast('姓名與 Email 為必填', false); return }
    if (!editTarget && !form.password) { showToast('新增時密碼為必填', false); return }
    setSaving(true)
    try {
      const body = editTarget
        ? { name: form.name, email: form.email, role: form.role, org_id: form.org_id || undefined, org_type: form.org_type || undefined, status: form.status, ...(form.password ? { password: form.password } : {}) }
        : form
      const url = editTarget ? `/api/users/${editTarget.id}` : '/api/users'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(editTarget ? '已更新' : '已新增', true)
      setShowModal(false)
      await load()
    } catch (e) { showToast(e instanceof Error ? e.message : '儲存失敗', false) }
    setSaving(false)
  }

  async function toggleStatus(u: UserRow) {
    const newStatus = u.status === 'active' ? 'suspended' : 'active'
    try {
      await fetch(`/api/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
      await load()
    } catch { showToast('操作失敗', false) }
  }

  const roleKey = ROLE_MAP[filter]
  const shown = roleKey ? users.filter(u => u.role === roleKey) : users
  const f = (k: keyof Form, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <TopBar title="帳號管理" subtitle="管理所有系統使用者帳號與權限" />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold">{editTarget ? '編輯帳號' : '新增帳號'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">姓名 *</label>
                  <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="王大明"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Email *</label>
                  <input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="user@example.com"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">{editTarget ? '新密碼（留空不變）' : '密碼 *'}</label>
                <div className="flex items-center gap-2 mt-1 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500">
                  <KeyRound size={14} className="text-gray-400" />
                  <input type="password" value={form.password} onChange={e => f('password', e.target.value)} placeholder="至少 6 字元"
                    className="flex-1 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">角色</label>
                  <select value={form.role} onChange={e => f('role', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="system_admin">系統管理者</option>
                    <option value="org_admin">機構管理員</option>
                    <option value="fleet_admin">車行管理員</option>
                    <option value="driver">駕駛</option>
                    <option value="viewer">查閱者</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">狀態</label>
                  <select value={form.status} onChange={e => f('status', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="active">正常</option>
                    <option value="suspended">停用</option>
                    <option value="pending">待審核</option>
                  </select>
                </div>
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
          <div className="flex gap-2 flex-wrap">
            {ROLE_FILTERS.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${s === filter ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{s}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus size={15} />新增帳號
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
                  {['帳號', '角色', '最後登入', '狀態', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">無符合條件的帳號</td></tr>}
                {shown.map(u => {
                  const meta = ROLE_META[u.role] ?? ROLE_META.viewer
                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs">{u.name.charAt(0)}</div>
                          <div>
                            <p className="font-medium text-gray-800">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${meta.color}`}>
                          {meta.icon}{meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700' : u.status === 'suspended' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                          {u.status === 'active' ? '正常' : u.status === 'suspended' ? '停用' : '待審核'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(u)} className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-0.5">
                            <Edit2 size={11} />編輯
                          </button>
                          <span className="text-gray-200">|</span>
                          <button onClick={() => toggleStatus(u)} className={`text-xs font-medium ${u.status === 'active' ? 'text-gray-500 hover:text-red-600' : 'text-green-600 hover:text-green-800'}`}>
                            {u.status === 'active' ? '停用' : '啟用'}
                          </button>
                        </div>
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
