'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import { Plus, Download, Copy, X, RefreshCw, Edit2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { BookingRecord } from '@/types'
import type { EnrichedBooking } from '@/lib/queries/bookings'

const STATUS_TABS    = ['全部', '待指派', '已指派', '進行中', '已完成', '請假', '取消'] as const
const BOOKING_STATUSES = ['待指派', '已指派', '進行中', '已完成', '請假', '取消'] as const
const PAGE_SIZE = 20

// ── 狀態進度條色彩 ────────────────────────────────────────────
const STATUS_BAR: Record<string, string> = {
  '待指派': 'bg-amber-400',
  '已指派': 'bg-blue-400',
  '進行中': 'bg-green-500',
  '已完成': 'bg-gray-300',
  '請假':   'bg-orange-400',
  '取消':   'bg-red-300',
}

interface EditForm {
  service_date: string; service_time: string
  direction: '去程' | '返程'
  pickup_address: string; dropoff_address: string
  wheelchair: boolean; status: string; notes: string
}

// ── Undo toast state ───────────────────────────────────────────
interface UndoState {
  id: string
  label: string
  countdown: number  // seconds remaining
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings]       = useState<EnrichedBooking[]>([])
  const [total, setTotal]             = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [page, setPage]               = useState(0)
  const [activeStatus, setActiveStatus] = useState<string>('全部')
  const [loading, setLoading]         = useState(true)
  const [editBooking, setEditBooking] = useState<EnrichedBooking | null>(null)
  const [editForm, setEditForm]       = useState<EditForm | null>(null)
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)
  const [undo, setUndo]               = useState<UndoState | null>(null)
  const undoTimerRef                  = useRef<ReturnType<typeof setInterval> | null>(null)
  const undoCancelledRef              = useRef(false)
  const [exporting, setExporting]     = useState(false)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // ── 取得訂單列表 ──────────────────────────────────────────────
  const fetchBookings = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeStatus !== '全部') params.set('status', activeStatus)
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(pg * PAGE_SIZE))
      const res = await fetch(`/api/bookings?${params}`)
      const json = await res.json()
      setBookings(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [activeStatus, page])

  // ── 取得各狀態計數（用於進度條）──────────────────────────────
  const fetchCounts = useCallback(async () => {
    const counts: Record<string, number> = {}
    await Promise.all(
      ['待指派', '已指派', '進行中', '已完成', '請假', '取消'].map(async s => {
        const p = new URLSearchParams({ status: s, limit: '1', offset: '0' })
        const r = await fetch(`/api/bookings?${p}`)
        const j = await r.json()
        counts[s] = j.total ?? 0
      })
    )
    setStatusCounts(counts)
  }, [])

  useEffect(() => { setPage(0) }, [activeStatus])
  useEffect(() => { fetchBookings(page) }, [activeStatus, page]) // eslint-disable-line
  useEffect(() => { fetchCounts() }, []) // eslint-disable-line

  // ── Undo 機制 ─────────────────────────────────────────────────
  function clearUndoTimer() {
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current)
      undoTimerRef.current = null
    }
  }

  function startUndo(id: string, label: string) {
    clearUndoTimer()
    undoCancelledRef.current = false
    setUndo({ id, label, countdown: 5 })

    undoTimerRef.current = setInterval(() => {
      setUndo(prev => {
        if (!prev) return null
        if (prev.countdown <= 1) {
          clearUndoTimer()
          // 倒數結束 → 真正執行取消
          if (!undoCancelledRef.current) {
            fetch(`/api/bookings/${prev.id}`, { method: 'DELETE' })
              .then(() => { fetchBookings(page); fetchCounts() })
          }
          return null
        }
        return { ...prev, countdown: prev.countdown - 1 }
      })
    }, 1000)
  }

  function handleUndoClick() {
    undoCancelledRef.current = true
    clearUndoTimer()
    setUndo(null)
    showToast('已復原，訂單未取消', true)
    fetchBookings(page)
  }

  function handleCancel(id: string, passengerName?: string) {
    // 先樂觀地從列表移除（視覺即時），等倒數結束才真正 DELETE
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: '取消' as const } : b))
    startUndo(id, passengerName ? `${passengerName} 的訂單` : '訂單')
    fetchCounts()
  }

  // ── 編輯訂單 ──────────────────────────────────────────────────
  function openEdit(b: EnrichedBooking) {
    setEditBooking(b)
    setEditForm({
      service_date:    b.service_date,
      service_time:    b.service_time ?? '',
      direction:       b.direction,
      pickup_address:  b.pickup_address ?? '',
      dropoff_address: b.dropoff_address ?? '',
      wheelchair:      b.wheelchair,
      status:          b.status,
      notes:           b.notes ?? '',
    })
  }

  async function handleSaveEdit() {
    if (!editBooking || !editForm) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bookings/${editBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error()
      showToast('已儲存', true)
      setEditBooking(null); setEditForm(null)
      fetchBookings(page); fetchCounts()
    } catch {
      showToast('儲存失敗', false)
    }
    setSaving(false)
  }

  // ── CSV 匯出 ──────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true)
    try {
      // 取得全部筆數（不分頁）
      const params = new URLSearchParams()
      if (activeStatus !== '全部') params.set('status', activeStatus)
      params.set('limit', '2000')
      params.set('offset', '0')
      const res  = await fetch(`/api/bookings?${params}`)
      const json = await res.json()
      const rows: EnrichedBooking[] = json.data ?? []

      const header = ['搭乘日期', '時間', '方向', '乘客姓名', '機構', '上車地址', '下車地址', '輪椅', '狀態', '備註']
      const lines  = rows.map(b => [
        b.service_date,
        b.service_time ?? '',
        b.direction,
        b.passenger?.name ?? '',
        b.care_unit?.short_name ?? b.care_unit?.name ?? '',
        b.pickup_address ?? '',
        b.dropoff_address ?? '',
        b.wheelchair ? '是' : '否',
        b.status,
        b.notes ?? '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

      const csv  = [header.join(','), ...lines].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `訂車紀錄_${activeStatus}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast(`已匯出 ${rows.length} 筆`, true)
    } catch {
      showToast('匯出失敗', false)
    }
    setExporting(false)
  }

  // ── 進度條計算 ────────────────────────────────────────────────
  const totalAll = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <TopBar title="訂車管理" subtitle="建立與管理所有訂車紀錄" />

      {/* ── 一般 Toast ─────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Undo Toast ─────────────────────────────────────────── */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-800 text-white rounded-2xl shadow-2xl text-sm">
          <span>已取消 {undo.label}</span>
          <span className="text-gray-400 text-xs tabular-nums">{undo.countdown}s</span>
          <button
            onClick={handleUndoClick}
            className="flex items-center gap-1 px-3 py-1 bg-white text-gray-800 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-xs"
          >
            <Undo2 size={12} />復原
          </button>
        </div>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────── */}
      {editBooking && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">編輯訂車</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editBooking.passenger?.name ?? editBooking.passenger_id}</p>
              </div>
              <button onClick={() => { setEditBooking(null); setEditForm(null) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">服務日期</label>
                  <input type="date" value={editForm.service_date}
                    onChange={e => setEditForm(f => f && ({ ...f, service_date: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">服務時間</label>
                  <input type="time" value={editForm.service_time}
                    onChange={e => setEditForm(f => f && ({ ...f, service_time: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">方向</label>
                  <select value={editForm.direction}
                    onChange={e => setEditForm(f => f && ({ ...f, direction: e.target.value as '去程' | '返程' }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="去程">去程</option><option value="返程">返程</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">狀態</label>
                  <select value={editForm.status}
                    onChange={e => setEditForm(f => f && ({ ...f, status: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {BOOKING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">上車地址</label>
                <input type="text" value={editForm.pickup_address}
                  onChange={e => setEditForm(f => f && ({ ...f, pickup_address: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">下車地址</label>
                <input type="text" value={editForm.dropoff_address}
                  onChange={e => setEditForm(f => f && ({ ...f, dropoff_address: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="edit-wheelchair" checked={editForm.wheelchair}
                  onChange={e => setEditForm(f => f && ({ ...f, wheelchair: e.target.checked }))}
                  className="w-4 h-4 accent-green-600" />
                <label htmlFor="edit-wheelchair" className="text-sm text-gray-700">需要輪椅無障礙車輛</label>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">備註</label>
                <textarea rows={2} value={editForm.notes}
                  onChange={e => setEditForm(f => f && ({ ...f, notes: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setEditBooking(null); setEditForm(null) }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <RefreshCw size={14} className="animate-spin" />}儲存
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">

        {/* ── 狀態進度條 ──────────────────────────────────────── */}
        {totalAll > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">訂單狀態總覽</p>
              <p className="text-xs text-gray-400">共 {totalAll} 筆</p>
            </div>
            {/* 橫條 */}
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
              {Object.entries(STATUS_BAR).map(([s, cls]) => {
                const cnt = statusCounts[s] ?? 0
                if (!cnt) return null
                const pct = (cnt / totalAll) * 100
                return <div key={s} className={`${cls} rounded-full`} style={{ width: `${pct}%` }} title={`${s}: ${cnt}`} />
              })}
            </div>
            {/* 圖例 */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_BAR).map(([s, cls]) => {
                const cnt = statusCounts[s] ?? 0
                return (
                  <button key={s} onClick={() => setActiveStatus(s)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors">
                    <span className={`w-2 h-2 rounded-full ${cls}`} />
                    {s} <span className="font-semibold text-gray-800">{cnt}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Toolbar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_TABS.map(s => (
              <button key={s} onClick={() => setActiveStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${s === activeStatus ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                {s}
                {s !== '全部' && statusCounts[s] ? (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${s === activeStatus ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                    {statusCounts[s]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchBookings(page)} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60">
              {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={15} />}
              匯出 CSV
            </button>
            <Link href="/org/bookings/new"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus size={15} />新增訂車
            </Link>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">訂車紀錄列表</h3>
            <span className="text-sm text-gray-500">
              {loading ? '載入中…' : `共 ${total} 筆，第 ${page + 1} / ${totalPages || 1} 頁`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['搭乘日期', '時間', '方向', '乘客姓名', '機構', '上車地址', '輪椅', '狀態', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400 text-sm">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />載入中…
                  </td></tr>
                )}
                {!loading && bookings.length === 0 && (
                  <tr><td colSpan={9} className="px-6 py-16 text-center">
                    <div className="text-gray-300 text-4xl mb-3">📋</div>
                    <p className="text-gray-500 font-medium">目前沒有符合條件的訂車紀錄</p>
                    {activeStatus === '全部' && (
                      <Link href="/org/bookings/new" className="inline-flex items-center gap-1 mt-2 text-sm text-green-600 hover:underline">
                        <Plus size={14} />新增第一筆訂車
                      </Link>
                    )}
                  </td></tr>
                )}
                {!loading && bookings.map(b => {
                  const locked = b.status === '取消' || b.status === '已完成'
                  return (
                    <tr key={b.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${locked ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{b.service_date}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.service_time || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${b.direction === '去程' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {b.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{b.passenger?.name ?? '—'}</p>
                        {b.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-24">{b.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.care_unit?.short_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-32 truncate">{b.pickup_address}</td>
                      <td className="px-4 py-3">{b.wheelchair && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">♿</span>}</td>
                      <td className="px-4 py-3"><Badge value={b.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {!locked && (
                            <button onClick={() => openEdit(b)}
                              className="text-xs text-green-600 hover:text-green-800 font-medium px-1 flex items-center gap-0.5">
                              <Edit2 size={11} />編輯
                            </button>
                          )}
                          <button onClick={() => router.push(`/org/bookings/new?from=${b.id}`)}
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium px-1 flex items-center gap-0.5">
                            <Copy size={11} />複製
                          </button>
                          {!locked && (
                            <button
                              onClick={() => handleCancel(b.id, b.passenger?.name)}
                              className="text-xs text-gray-400 hover:text-red-600 font-medium px-1 flex items-center gap-0.5"
                            >
                              <X size={11} />取消
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                顯示第 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} 筆，共 {total} 筆
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pg = totalPages <= 7 ? i : (page < 4 ? i : page - 3 + i)
                  if (pg >= totalPages) return null
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${pg === page ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {pg + 1}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
