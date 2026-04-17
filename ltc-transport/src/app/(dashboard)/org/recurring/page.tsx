'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays, Plus, Pencil, Trash2, Play, CheckCircle2,
  AlertCircle, ChevronDown, Loader2, X, RefreshCw,
} from 'lucide-react'
import type { RecurringTemplate, DayOfWeek } from '@/types'

// ── 常數 ──────────────────────────────────────────────────────
const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const DAY_COLORS = [
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-blue-100 text-blue-700',
  'bg-blue-100 text-blue-700',
  'bg-blue-100 text-blue-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
]

function today(): string { return new Date().toISOString().split('T')[0] }
function firstOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
}

// ── 範本表單 ──────────────────────────────────────────────────
interface TmplForm {
  passenger_id: string
  care_unit_id: string
  day_of_week: DayOfWeek
  service_time: string
  direction: '去程' | '返程'
  pickup_address: string
  dropoff_address: string
  wheelchair: boolean
  notes: string
  is_active: boolean
}

const EMPTY_FORM: TmplForm = {
  passenger_id: '',
  care_unit_id: '',
  day_of_week: 1,
  service_time: '08:00',
  direction: '去程',
  pickup_address: '',
  dropoff_address: '',
  wheelchair: false,
  notes: '',
  is_active: true,
}

// ── 型別 ─────────────────────────────────────────────────────
interface Passenger { id: string; name: string; care_unit_id: string; pickup_address?: string; dropoff_address?: string; wheelchair: boolean }
interface CareUnit  { id: string; name: string; short_name?: string }
interface GenerateResult { created: number; skipped: number }

// ── 主頁面 ────────────────────────────────────────────────────
export default function RecurringPage() {
  const [templates, setTemplates]     = useState<RecurringTemplate[]>([])
  const [passengers, setPassengers]   = useState<Passenger[]>([])
  const [careUnits, setCareUnits]     = useState<CareUnit[]>([])
  const [loading, setLoading]         = useState(true)
  const [filterCu, setFilterCu]       = useState('')

  // 表單 modal
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [form, setForm]               = useState<TmplForm>(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState('')

  // 產生訂單 panel
  const [showGenerate, setShowGenerate] = useState(false)
  const [genStart, setGenStart]       = useState(firstOfMonth)
  const [genEnd, setGenEnd]           = useState(today)
  const [genSelected, setGenSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating]   = useState(false)
  const [genResult, setGenResult]     = useState<GenerateResult | null>(null)
  const [genError, setGenError]       = useState('')

  // 刪除確認
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)

  // ── 載入資料 ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const [tmplRes, pasRes, cuRes] = await Promise.all([
      fetch('/api/recurring-templates'),
      fetch('/api/passengers'),
      fetch('/api/care-units'),
    ])
    const [tmplJson, pasJson, cuJson] = await Promise.all([
      tmplRes.json(), pasRes.json(), cuRes.json(),
    ])
    setTemplates(tmplJson.data ?? [])
    setPassengers(pasJson.data ?? [])
    setCareUnits(cuJson.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── 篩選 ────────────────────────────────────────────────────
  const visible = filterCu
    ? templates.filter(t => t.care_unit_id === filterCu)
    : templates

  // 按星期分組
  const byDay = Array.from({ length: 7 }, (_, i) =>
    visible.filter(t => t.day_of_week === i)
  )

  // ── 表單處理 ────────────────────────────────────────────────
  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(t: RecurringTemplate) {
    setEditingId(t.id)
    setForm({
      passenger_id:    t.passenger_id,
      care_unit_id:    t.care_unit_id,
      day_of_week:     t.day_of_week,
      service_time:    t.service_time,
      direction:       t.direction,
      pickup_address:  t.pickup_address ?? '',
      dropoff_address: t.dropoff_address ?? '',
      wheelchair:      t.wheelchair,
      notes:           t.notes ?? '',
      is_active:       t.is_active,
    })
    setFormError('')
    setShowForm(true)
  }

  function handlePassengerChange(pid: string) {
    const p = passengers.find(x => x.id === pid)
    setForm(f => ({
      ...f,
      passenger_id:    pid,
      care_unit_id:    p?.care_unit_id ?? f.care_unit_id,
      pickup_address:  p?.pickup_address ?? f.pickup_address,
      dropoff_address: p?.dropoff_address ?? f.dropoff_address,
      wheelchair:      p?.wheelchair ?? f.wheelchair,
    }))
  }

  async function handleSave() {
    if (!form.passenger_id || !form.care_unit_id || !form.service_time) {
      setFormError('請填寫乘客、所屬單位及服務時間')
      return
    }
    setSaving(true); setFormError('')
    const url = editingId ? `/api/recurring-templates/${editingId}` : '/api/recurring-templates'
    const method = editingId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json()
      setFormError(j.error ?? '儲存失敗')
      return
    }
    setShowForm(false)
    load()
  }

  // ── 刪除 ────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/recurring-templates/${deleteId}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteId(null)
    load()
  }

  // ── 切換啟用 ────────────────────────────────────────────────
  async function toggleActive(t: RecurringTemplate) {
    await fetch(`/api/recurring-templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !t.is_active }),
    })
    load()
  }

  // ── 批次產生 ────────────────────────────────────────────────
  function openGenerate() {
    setGenSelected(new Set(visible.filter(t => t.is_active).map(t => t.id)))
    setGenResult(null); setGenError('')
    setShowGenerate(true)
  }

  function toggleGenSelect(id: string) {
    setGenSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function handleGenerate() {
    if (!genStart || !genEnd) { setGenError('請選擇日期區間'); return }
    if (genSelected.size === 0) { setGenError('請至少選擇一個範本'); return }
    setGenerating(true); setGenError(''); setGenResult(null)
    const res = await fetch('/api/recurring-templates/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: genStart,
        end_date: genEnd,
        template_ids: Array.from(genSelected),
        care_unit_id: filterCu || undefined,
      }),
    })
    setGenerating(false)
    const json = await res.json()
    if (!res.ok) { setGenError(json.error ?? '產生失敗'); return }
    setGenResult(json.data)
  }

  // ── 渲染 ────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">週期排班</h1>
          <p className="text-sm text-gray-500 mt-0.5">設定固定週期接送範本，批次產生訂單</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openGenerate}
            disabled={visible.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            <Play size={16} />批次產生訂單
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Plus size={16} />新增範本
          </button>
        </div>
      </div>

      {/* 篩選 */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={filterCu}
            onChange={e => setFilterCu(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white"
          >
            <option value="">全部單位</option>
            {careUnits.map(c => <option key={c.id} value={c.id}>{c.short_name ?? c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <span className="text-sm text-gray-400">共 {visible.length} 個範本</span>
        <button onClick={load} className="ml-auto p-2 text-gray-400 hover:text-gray-700 transition-colors">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 星期週視圖 */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
          <CalendarDays size={40} className="text-gray-200" />
          <p className="text-sm">尚無週期排班範本，點擊「新增範本」開始建立</p>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {byDay.map((dayTmpls, dow) => (
            <div key={dow} className="space-y-2">
              <div className={`text-center text-xs font-bold py-1.5 rounded-lg ${DAY_COLORS[dow]}`}>
                {DAY_LABELS[dow]}
              </div>
              {dayTmpls.length === 0 ? (
                <div className="h-12 border-2 border-dashed border-gray-100 rounded-lg" />
              ) : (
                dayTmpls.map(t => (
                  <TemplateCard
                    key={t.id}
                    tmpl={t}
                    onEdit={() => openEdit(t)}
                    onDelete={() => setDeleteId(t.id)}
                    onToggle={() => toggleActive(t)}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 表單 Modal ────────────────────────────────────── */}
      {showForm && (
        <Modal title={editingId ? '編輯週期範本' : '新增週期範本'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            {formError && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />{formError}
              </div>
            )}

            <Field label="乘客 *">
              <select
                value={form.passenger_id}
                onChange={e => handlePassengerChange(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">— 選擇乘客 —</option>
                {passengers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="服務週期 *">
                <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: Number(e.target.value) as DayOfWeek }))} className={SELECT_CLS}>
                  {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </Field>
              <Field label="服務時間 *">
                <input type="time" value={form.service_time}
                  onChange={e => setForm(f => ({ ...f, service_time: e.target.value }))}
                  className={INPUT_CLS} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="方向">
                <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as '去程' | '返程' }))} className={SELECT_CLS}>
                  <option value="去程">去程</option>
                  <option value="返程">返程</option>
                </select>
              </Field>
              <Field label="輪椅">
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={form.wheelchair} onChange={e => setForm(f => ({ ...f, wheelchair: e.target.checked }))} className="w-4 h-4 accent-green-600" />
                  <span className="text-sm text-gray-700">需要輪椅空間</span>
                </label>
              </Field>
            </div>

            <Field label="上車地址">
              <input type="text" value={form.pickup_address}
                onChange={e => setForm(f => ({ ...f, pickup_address: e.target.value }))}
                placeholder="留空則使用乘客預設地址"
                className={INPUT_CLS} />
            </Field>
            <Field label="下車地址">
              <input type="text" value={form.dropoff_address}
                onChange={e => setForm(f => ({ ...f, dropoff_address: e.target.value }))}
                placeholder="留空則使用乘客預設地址"
                className={INPUT_CLS} />
            </Field>

            <Field label="備註">
              <textarea value={form.notes} rows={2}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className={INPUT_CLS + ' resize-none'} />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 accent-green-600" />
              <span className="text-sm text-gray-700">啟用此範本（批次產生時納入）</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className={CANCEL_BTN}>取消</button>
              <button onClick={handleSave} disabled={saving} className={SAVE_BTN}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 批次產生 Panel ────────────────────────────────── */}
      {showGenerate && (
        <Modal title="批次產生訂單" onClose={() => setShowGenerate(false)} wide>
          <div className="space-y-4">
            {/* 日期區間 */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="開始日期">
                <input type="date" value={genStart}
                  onChange={e => setGenStart(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="結束日期">
                <input type="date" value={genEnd}
                  onChange={e => setGenEnd(e.target.value)} className={INPUT_CLS} />
              </Field>
            </div>

            {/* 選擇範本 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">選擇範本</label>
                <div className="flex gap-2 text-xs">
                  <button className="text-green-600 hover:underline"
                    onClick={() => setGenSelected(new Set(visible.map(t => t.id)))}>
                    全選
                  </button>
                  <span className="text-gray-300">|</span>
                  <button className="text-gray-500 hover:underline"
                    onClick={() => setGenSelected(new Set())}>
                    取消全選
                  </button>
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
                {visible.map(t => (
                  <label key={t.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox"
                      checked={genSelected.has(t.id)}
                      onChange={() => toggleGenSelect(t.id)}
                      className="w-4 h-4 accent-green-600" />
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${DAY_COLORS[t.day_of_week]}`}>
                      {DAY_LABELS[t.day_of_week]}
                    </span>
                    <span className="text-sm text-gray-800 font-medium truncate">
                      {t.passenger?.name ?? t.passenger_id}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{t.service_time} {t.direction}</span>
                    {!t.is_active && (
                      <span className="text-xs text-gray-300 shrink-0">（停用）</span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">已選 {genSelected.size} / {visible.length} 個範本</p>
            </div>

            {/* 錯誤 / 結果 */}
            {genError && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />{genError}
              </div>
            )}
            {genResult && (
              <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                成功產生 <strong>{genResult.created}</strong> 筆訂單，
                略過已存在 <strong>{genResult.skipped}</strong> 筆
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowGenerate(false)} className={CANCEL_BTN}>關閉</button>
              <button onClick={handleGenerate} disabled={generating || genSelected.size === 0} className={SAVE_BTN}>
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                {generating ? '產生中…' : '確認產生'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 刪除確認 ──────────────────────────────────────── */}
      {deleteId && (
        <Modal title="確認刪除" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-4">確定要刪除此週期排班範本嗎？此操作無法復原。</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteId(null)} className={CANCEL_BTN}>取消</button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {deleting ? '刪除中…' : '確認刪除'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── TemplateCard ──────────────────────────────────────────────
function TemplateCard({
  tmpl, onEdit, onDelete, onToggle,
}: {
  tmpl: RecurringTemplate
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <div className={`border rounded-lg p-2 text-xs transition-opacity ${tmpl.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">{tmpl.passenger?.name ?? '—'}</p>
          <p className="text-gray-500">{tmpl.service_time} · {tmpl.direction}</p>
          {tmpl.wheelchair && <p className="text-orange-500 mt-0.5">♿ 輪椅</p>}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={onToggle} title={tmpl.is_active ? '停用' : '啟用'}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <CheckCircle2 size={12} className={tmpl.is_active ? 'text-green-500' : ''} />
          </button>
          <button onClick={onEdit}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────
function Modal({ title, children, onClose, wide = false }: {
  title: string; children: React.ReactNode; onClose: () => void; wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  )
}

const INPUT_CLS  = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
const SELECT_CLS = INPUT_CLS + ' appearance-none bg-white'
const CANCEL_BTN = 'px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
const SAVE_BTN   = 'flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors'
