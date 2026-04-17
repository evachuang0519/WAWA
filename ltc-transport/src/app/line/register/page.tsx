'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TRANSPORT_COMPANIES } from '@/lib/db'
import {
  Truck, User, Phone, FileText, Car, Calendar,
  CheckCircle2, AlertCircle, RefreshCw, ChevronDown,
} from 'lucide-react'

interface Form {
  name: string
  phone: string
  license_number: string
  license_class: string
  company_id: string
  license_expiry: string
  health_cert_expiry: string
}

const LICENSE_CLASSES = ['職業小客', '職業大客', '普通小客', '普通大客']

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const lineDisplayName = searchParams.get('name') ?? ''
  const linePicture = searchParams.get('pic') ?? ''

  const [form, setForm] = useState<Form>({
    name: lineDisplayName,
    phone: '',
    license_number: '',
    license_class: '職業小客',
    company_id: TRANSPORT_COMPANIES[0]?.id ?? '',
    license_expiry: '',
    health_cert_expiry: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // If no LINE profile data present, redirect to login
  useEffect(() => {
    if (!lineDisplayName) {
      router.replace('/line/login')
    }
  }, [lineDisplayName, router])

  const f = <K extends keyof Form>(key: K, val: Form[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  async function handleSubmit() {
    if (!form.name || !form.phone || !form.license_number || !form.license_class || !form.company_id) {
      setError('請填寫所有必填欄位（*）')
      return
    }
    if (!/^09\d{8}$/.test(form.phone.replace(/-/g, ''))) {
      setError('手機號碼格式不正確（例：0912345678）')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/auth/line/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '註冊失敗')
      router.replace('/line/tasks')
    } catch (e) {
      setError(e instanceof Error ? e.message : '系統錯誤，請稍後再試')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-green-600 to-green-700 px-0 pb-0">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center overflow-hidden shadow">
            {linePicture
              ? <img src={linePicture} alt="LINE 大頭貼" className="w-full h-full object-cover" />
              : <Truck size={32} className="text-white" />
            }
          </div>
          <div>
            <p className="text-green-100 text-sm">LINE 登入成功</p>
            <h1 className="text-xl font-bold">{lineDisplayName}</h1>
          </div>
        </div>
        <p className="text-green-100 text-sm leading-relaxed">
          請補齊以下資料完成駕駛帳號建立，完成後即可開始使用任務系統。
        </p>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-white rounded-t-3xl px-5 py-6 space-y-5 shadow-2xl">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            <AlertCircle size={16} className="shrink-0" />{error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            姓名 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
            <User size={16} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={form.name}
              onChange={e => f('name', e.target.value)}
              placeholder="請輸入真實姓名"
              className="flex-1 focus:outline-none text-gray-800 placeholder-gray-300"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            手機號碼 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 mt-1.5 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
            <Phone size={16} className="text-gray-400 shrink-0" />
            <input
              type="tel"
              value={form.phone}
              onChange={e => f('phone', e.target.value)}
              placeholder="0912345678"
              inputMode="tel"
              className="flex-1 focus:outline-none text-gray-800 placeholder-gray-300"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Company */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            所屬車行 <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1.5">
            <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
              <Car size={16} className="text-gray-400 shrink-0" />
              <select
                value={form.company_id}
                onChange={e => f('company_id', e.target.value)}
                className="flex-1 focus:outline-none text-gray-800 bg-transparent appearance-none"
                style={{ fontSize: '16px' }}
              >
                {TRANSPORT_COMPANIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* License number + class */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              駕照號碼 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 mt-1.5 border border-gray-200 rounded-2xl px-3 py-3 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
              <FileText size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={form.license_number}
                onChange={e => f('license_number', e.target.value.toUpperCase())}
                placeholder="A123456789"
                className="flex-1 focus:outline-none text-gray-800 placeholder-gray-300 min-w-0"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              類別 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1 mt-1.5 border border-gray-200 rounded-2xl px-3 py-3 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
              <select
                value={form.license_class}
                onChange={e => f('license_class', e.target.value)}
                className="flex-1 focus:outline-none text-gray-800 bg-transparent appearance-none min-w-0"
                style={{ fontSize: '16px' }}
              >
                {LICENSE_CLASSES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Expiry dates — optional */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">到期日期（選填）</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">駕照到期</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-3 py-3 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={form.license_expiry}
                  onChange={e => f('license_expiry', e.target.value)}
                  className="flex-1 focus:outline-none text-gray-800 min-w-0 bg-transparent"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">健檢到期</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-3 py-3 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={form.health_cert_expiry}
                  onChange={e => f('health_cert_expiry', e.target.value)}
                  className="flex-1 focus:outline-none text-gray-800 min-w-0 bg-transparent"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-600 leading-relaxed">
          📋 您的資料將由所屬車行管理員審核，審核通過後即可接收派車任務。
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white font-bold text-base rounded-2xl active:scale-[0.98] shadow-lg shadow-green-200 disabled:opacity-60 transition-transform"
        >
          {saving
            ? <RefreshCw size={18} className="animate-spin" />
            : <CheckCircle2 size={18} />
          }
          {saving ? '建立帳號中…' : '完成註冊'}
        </button>

        <p className="text-center text-xs text-gray-400 pb-2">
          完成後即以您的 LINE 帳號登入，無需記住密碼
        </p>
      </div>
    </div>
  )
}

export default function LineRegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-green-600">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
