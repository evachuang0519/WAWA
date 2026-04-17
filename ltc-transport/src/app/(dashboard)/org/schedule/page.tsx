'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import {
  ChevronLeft, ChevronRight, X, MapPin, Clock,
  User, Phone, Car, Building2, FileText, Navigation,
  RefreshCw, AlertCircle,
} from 'lucide-react'
import type { EnrichedBooking } from '@/lib/queries/bookings'

// ── 常數 ──────────────────────────────────────────────────────
const DAYS = ['日', '一', '二', '三', '四', '五', '六']

const TIME_SLOTS_OUT = ['07:30', '08:00', '08:15', '08:30', '09:00']
const TIME_SLOTS_RET = ['14:00', '15:00', '16:00', '16:30', '17:00']

const STATUS_CELL: Record<string, string> = {
  '待指派': 'bg-amber-50 border-amber-300 text-amber-800',
  '已指派': 'bg-blue-50 border-blue-300 text-blue-800',
  '進行中': 'bg-green-50 border-green-300 text-green-800',
  '已完成': 'bg-gray-100 border-gray-300 text-gray-500',
  '請假':   'bg-orange-50 border-orange-300 text-orange-700',
  '取消':   'bg-red-50 border-red-200 text-red-400 line-through opacity-60',
}

// ── 工具函式 ──────────────────────────────────────────────────
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ── 主頁面 ────────────────────────────────────────────────────
export default function SchedulePage() {
  const [monday, setMonday]         = useState(() => getMondayOf(new Date()))
  const [bookings, setBookings]     = useState<EnrichedBooking[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<EnrichedBooking | null>(null)

  const weekDates = Array.from({ length: 7 }, (_, i) => toDateStr(addDays(monday, i)))
  const today     = toDateStr(new Date())
  const startDate = weekDates[0]
  const endDate   = weekDates[6]

  // ── 載入當週訂單 ────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate, limit: '500' })
      const res  = await fetch(`/api/bookings?${params}`)
      const json = await res.json()
      setBookings(json.data ?? [])
    } catch {
      setBookings([])
    }
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  // ── 週導覽 ───────────────────────────────────────────────────
  function prevWeek() { setMonday(m => addDays(m, -7)) }
  function nextWeek() { setMonday(m => addDays(m, +7)) }
  function goToday()  { setMonday(getMondayOf(new Date())) }

  const isCurrentWeek = weekDates.includes(today)

  // ── 格子資料查詢 ────────────────────────────────────────────
  function cellBookings(date: string, slot: string, dir: string): EnrichedBooking[] {
    return bookings.filter(b =>
      b.service_date === date &&
      b.service_time === slot &&
      b.direction    === dir  &&
      b.status       !== '取消'
    )
  }

  // 該格子所有時段（slot 為空時找「此日期/方向」的非標準時段）
  function extraSlots(date: string, dir: string, knownSlots: string[]): string[] {
    return [...new Set(
      bookings
        .filter(b => b.service_date === date && b.direction === dir && !knownSlots.includes(b.service_time ?? ''))
        .map(b => b.service_time ?? '')
        .filter(Boolean)
    )].sort()
  }

  // ── 週統計 ───────────────────────────────────────────────────
  const weekTotal     = bookings.length
  const weekPending   = bookings.filter(b => b.status === '待指派').length
  const weekCompleted = bookings.filter(b => b.status === '已完成').length

  // ── 渲染單一格子項目 ─────────────────────────────────────────
  function BookingChip({ b }: { b: EnrichedBooking }) {
    return (
      <button
        key={b.id}
        onClick={() => setSelected(b)}
        className={`w-full text-left text-xs rounded border px-1.5 py-1 mb-1 transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] ${STATUS_CELL[b.status] ?? 'bg-gray-100 border-gray-200 text-gray-600'}`}
      >
        <p className="font-semibold truncate leading-tight">{b.passenger?.name ?? '—'}</p>
        {b.assigned_driver_id && (
          <p className="opacity-60 truncate text-[10px] leading-tight mt-0.5">
            {b.vehicle?.plate_number ?? ''}
          </p>
        )}
        {b.wheelchair && <span className="text-[10px]">♿ </span>}
      </button>
    )
  }

  // ── 渲染時段行 ───────────────────────────────────────────────
  function TimeRow({ slot, dir }: { slot: string; dir: string }) {
    const hasAny = weekDates.some(d => cellBookings(d, slot, dir).length > 0)
    if (!hasAny) return null
    return (
      <div className="grid grid-cols-8 border-b border-gray-50 min-h-[52px]">
        <div className="px-3 py-2 text-xs text-gray-400 font-mono flex items-start pt-2.5 bg-gray-50/40">
          {slot}
        </div>
        {weekDates.map(date => {
          const items = cellBookings(date, slot, dir)
          return (
            <div key={date} className={`p-1 border-l border-gray-50 ${date === today ? 'bg-green-50/20' : ''}`}>
              {items.map(b => <BookingChip key={b.id} b={b} />)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <TopBar title="本週班表" subtitle="點選項目查看詳細資訊" />

      <div className="p-6 space-y-4">

        {/* ── 週導覽 ────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronRight size={18} />
            </button>
            {!isCurrentWeek && (
              <button onClick={goToday} className="text-xs text-green-600 hover:underline font-medium px-2">
                回本週
              </button>
            )}
          </div>

          {/* 日期欄 */}
          <div className="flex gap-1">
            {weekDates.map((date, i) => {
              const isToday = date === today
              const dayName = DAYS[(new Date(date).getDay())]
              const dayNum  = date.split('-')[2]
              const cnt     = bookings.filter(b => b.service_date === date).length
              return (
                <div key={date} className={`flex flex-col items-center px-3 py-2 rounded-xl ${isToday ? 'bg-green-600 text-white' : 'text-gray-500'}`}>
                  <span className="text-xs font-medium">{dayName}</span>
                  <span className="text-sm font-bold">{dayNum}</span>
                  {cnt > 0 && (
                    <span className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full font-medium ${isToday ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {cnt}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 週統計 */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <button onClick={load} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <span>共 <strong className="text-gray-700">{weekTotal}</strong> 趟</span>
            {weekPending > 0 && (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <AlertCircle size={12} />待指派 {weekPending}
              </span>
            )}
            <span className="text-green-600">已完成 {weekCompleted}</span>
          </div>
        </div>

        {/* ── 班表格 ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* 表頭 */}
          <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
            <div className="px-3 py-3 text-xs font-semibold text-gray-400">時間</div>
            {weekDates.map((date, i) => {
              const isToday = date === today
              return (
                <div key={date} className={`px-1 py-3 text-center text-xs font-semibold ${isToday ? 'text-green-700 bg-green-50' : 'text-gray-500'}`}>
                  {DAYS[new Date(date).getDay()]} {date.split('-')[2]}
                </div>
              )
            })}
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center text-gray-300 gap-2">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">載入中…</span>
            </div>
          ) : (
            <>
              {/* 去程 */}
              <div className="border-b border-gray-200">
                <div className="px-3 py-2 bg-green-50 text-xs font-bold text-green-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />去程
                </div>
                {[...TIME_SLOTS_OUT, ...extraSlots(weekDates[0], '去程', TIME_SLOTS_OUT)].map(slot => (
                  <TimeRow key={slot} slot={slot} dir="去程" />
                ))}
                {!weekDates.some(d => bookings.some(b => b.service_date === d && b.direction === '去程')) && (
                  <div className="grid grid-cols-8 min-h-[48px]">
                    <div className="px-3 py-3 text-xs text-gray-300 bg-gray-50/40">—</div>
                    {weekDates.map(d => <div key={d} className="border-l border-gray-50" />)}
                  </div>
                )}
              </div>

              {/* 返程 */}
              <div>
                <div className="px-3 py-2 bg-blue-50 text-xs font-bold text-blue-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />返程
                </div>
                {[...TIME_SLOTS_RET, ...extraSlots(weekDates[0], '返程', TIME_SLOTS_RET)].map(slot => (
                  <TimeRow key={slot} slot={slot} dir="返程" />
                ))}
                {!weekDates.some(d => bookings.some(b => b.service_date === d && b.direction === '返程')) && (
                  <div className="grid grid-cols-8 min-h-[48px]">
                    <div className="px-3 py-3 text-xs text-gray-300 bg-gray-50/40">—</div>
                    {weekDates.map(d => <div key={d} className="border-l border-gray-50" />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 圖例 */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="font-medium text-gray-600">圖例：</span>
          {Object.entries(STATUS_CELL).filter(([s]) => s !== '取消').map(([label, cls]) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded border ${cls}`} />
              <span>{label}</span>
            </div>
          ))}
          <span className="text-gray-400 ml-2">點選格子項目可查看詳情</span>
        </div>
      </div>

      {/* ── 詳情 Modal ──────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-5 py-4 flex items-center gap-3 rounded-t-2xl ${selected.direction === '去程' ? 'bg-green-600' : 'bg-blue-600'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">
                  {selected.service_date} · {selected.direction}
                </p>
                <p className="text-white font-bold text-lg truncate">
                  {selected.passenger?.name ?? '—'}
                </p>
              </div>
              <Badge value={selected.status} className="shrink-0" />
              <button onClick={() => setSelected(null)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">

              {/* 服務時間 */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <Clock size={16} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{selected.service_date}</p>
                  <p className="text-xs text-gray-400">{selected.service_time ?? '時間未設定'}</p>
                </div>
                <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${selected.direction === '去程' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {selected.direction}
                </span>
              </div>

              {/* 行程路線 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">行程路線</p>
                <div className="relative pl-5 space-y-0">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
                  <div className="relative flex items-start gap-3 pb-3">
                    <span className="absolute -left-5 mt-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">上車地點</p>
                      <p className="text-sm font-medium text-gray-800">{selected.pickup_address || '（未填）'}</p>
                    </div>
                  </div>
                  <div className="relative flex items-start gap-3">
                    <span className="absolute -left-5 mt-0.5 w-3.5 h-3.5 rounded-full bg-red-400 border-2 border-white shadow shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">下車地點</p>
                      <p className="text-sm font-medium text-gray-800">{selected.dropoff_address || '（未填）'}</p>
                    </div>
                  </div>
                </div>
                {selected.pickup_address && (
                  <a
                    href={`https://maps.google.com/?saddr=${encodeURIComponent(selected.pickup_address)}&daddr=${encodeURIComponent(selected.dropoff_address ?? '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-1.5 py-2 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Navigation size={12} />開啟導航路線
                  </a>
                )}
              </div>

              {/* 乘客資訊 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">乘客資訊</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="font-semibold text-gray-800">{selected.passenger?.name ?? '—'}</span>
                      {selected.wheelchair && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">♿</span>
                      )}
                    </div>
                    {selected.passenger?.phone && (
                      <a href={`tel:${selected.passenger.phone}`}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                        <Phone size={11} />{selected.passenger.phone}
                      </a>
                    )}
                  </div>
                  {selected.passenger?.emergency_contact && (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>緊急：{selected.passenger.emergency_contact}</span>
                      {selected.passenger.emergency_phone && (
                        <a href={`tel:${selected.passenger.emergency_phone}`}
                          className="text-orange-600 hover:text-orange-800">
                          {selected.passenger.emergency_phone}
                        </a>
                      )}
                    </div>
                  )}
                  {selected.passenger?.disability_level && (
                    <p className="text-xs text-gray-400">殘障等級：{selected.passenger.disability_level}</p>
                  )}
                </div>
              </div>

              {/* 機構 */}
              {selected.care_unit && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <Building2 size={15} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">長照機構</p>
                    <p className="text-sm font-medium text-gray-800">{selected.care_unit.name}</p>
                    {selected.care_unit.phone && (
                      <p className="text-xs text-gray-400 mt-0.5">{selected.care_unit.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 指派資訊 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">指派資訊</p>
                {selected.assigned_driver_id ? (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <User size={14} className="text-green-500 shrink-0" />
                      <span className="font-medium">駕駛已指派</span>
                    </div>
                    {selected.vehicle && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Car size={12} className="text-blue-500" />
                        {selected.vehicle.plate_number} · {selected.vehicle.brand} {selected.vehicle.model}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium flex items-center gap-2">
                    <AlertCircle size={14} />尚未指派駕駛，請至「任務指派」處理
                  </div>
                )}
              </div>

              {/* 備註 */}
              {selected.notes && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-yellow-600 mb-1">
                    <FileText size={11} />備註
                  </div>
                  <p className="text-sm text-gray-700">{selected.notes}</p>
                </div>
              )}

              {/* 底部按鈕 */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setSelected(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  關閉
                </button>
                <a href={`/org/bookings`}
                  className="flex-1 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors text-center">
                  前往訂車管理
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
