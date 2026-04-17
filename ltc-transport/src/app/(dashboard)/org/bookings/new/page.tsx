'use client'
import TopBar from '@/components/layout/TopBar'
import { PASSENGERS, CARE_UNITS } from '@/lib/db'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Copy, ArrowLeftRight, Loader2, Calendar, CalendarDays } from 'lucide-react'
import type { BookingRecord } from '@/types'

type FormState = {
  care_unit_id: string
  passenger_id: string
  service_date: string
  service_time: string
  pickup_address: string
  dropoff_address: string
  wheelchair: boolean
  notes: string
}

const today = new Date().toISOString().split('T')[0]

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay() // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const WEEKDAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']

export default function NewBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const copyFromId = searchParams.get('from')

  const [isCopyMode, setIsCopyMode] = useState(false)
  const [loadingCopy, setLoadingCopy] = useState(false)
  const [form, setForm] = useState<FormState>({
    care_unit_id: 'cu-1',
    passenger_id: '',
    service_date: today,
    service_time: '08:00',
    pickup_address: '',
    dropoff_address: '',
    wheelchair: false,
    notes: '',
  })

  // Round trip state
  const [roundTrip, setRoundTrip] = useState(false)
  const [returnTime, setReturnTime] = useState('16:00')
  const [returnDate, setReturnDate] = useState(today)

  // Date mode state
  const [dateMode, setDateMode] = useState<'single' | 'multi'>('single')
  const [weekStart, setWeekStart] = useState(() => getMondayOf(today))
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<BookingRecord[] | null>(null)

  // Load source booking when copying
  useEffect(() => {
    if (!copyFromId) return
    setLoadingCopy(true)
    fetch(`/api/bookings/${copyFromId}`)
      .then(r => r.json())
      .then(({ data }: { data: BookingRecord }) => {
        if (!data) return
        setIsCopyMode(true)
        setForm({
          care_unit_id: data.care_unit_id,
          passenger_id: data.passenger_id,
          service_date: today,
          service_time: data.service_time ?? '08:00',
          pickup_address: data.pickup_address ?? '',
          dropoff_address: data.dropoff_address ?? '',
          wheelchair: data.wheelchair,
          notes: data.notes ?? '',
        })
      })
      .finally(() => setLoadingCopy(false))
  }, [copyFromId])

  const selectedPassenger = PASSENGERS.find(p => p.id === form.passenger_id)
  const filteredPassengers = PASSENGERS.filter(p => p.care_unit_id === form.care_unit_id && p.status === 'active')

  function handlePassengerChange(id: string) {
    const p = PASSENGERS.find(ps => ps.id === id)
    setForm(f => ({
      ...f,
      passenger_id: id,
      pickup_address: p?.pickup_address ?? '',
      dropoff_address: p?.dropoff_address ?? '',
      wheelchair: p?.wheelchair ?? false,
    }))
  }

  function toggleDay(offset: number) {
    setSelectedDays(prev =>
      prev.includes(offset) ? prev.filter(d => d !== offset) : [...prev, offset]
    )
  }

  // Computed: actual dates for selected weekdays
  const multiDates = [...selectedDays].sort().map(offset => ({
    offset,
    label: WEEKDAY_LABELS[offset],
    date: addDays(weekStart, offset),
  }))

  // Submit button label
  const submitLabel = (() => {
    if (submitting) return null
    if (dateMode === 'single') {
      return roundTrip ? '建立去程＋返程（2筆）' : '建立訂車'
    }
    const days = selectedDays.length
    const trips = roundTrip ? 2 : 1
    const total = days * trips
    if (days === 0) return '請選擇日期'
    return `建立 ${days} 天 × ${trips} 程 ＝ ${total} 筆訂單`
  })()

  const canSubmit = !!form.passenger_id && !submitting &&
    (dateMode === 'single' || selectedDays.length > 0)

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const allResults: BookingRecord[] = []

      if (dateMode === 'single') {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            round_trip: roundTrip,
            return_time: roundTrip ? returnTime : undefined,
            return_date: roundTrip ? returnDate : undefined,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        allResults.push(...(Array.isArray(json.data) ? json.data : [json.data]))
      } else {
        for (const { date } of multiDates) {
          const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...form,
              service_date: date,
              round_trip: roundTrip,
              return_time: roundTrip ? returnTime : undefined,
              return_date: roundTrip ? date : undefined,
            }),
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.error)
          allResults.push(...(Array.isArray(json.data) ? json.data : [json.data]))
        }
      }

      setResult(allResults)
    } catch (e) {
      alert((e as Error).message || '建立失敗，請再試一次')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────
  if (result) {
    return (
      <div>
        <TopBar title="新增訂車" subtitle="建立新的訂車紀錄" />
        <div className="p-6">
          <div className="max-w-lg mx-auto bg-white rounded-xl border border-green-200 shadow-sm p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-gray-800 mb-1">
              訂車成功！已建立 {result.length} 筆
            </p>
            <p className="text-sm text-gray-400 mb-5">等待指派駕駛與車輛</p>

            {/* Created booking cards */}
            <div className="space-y-2 text-left mb-6 max-h-72 overflow-y-auto">
              {result.map(b => (
                <div key={b.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${b.direction === '去程' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${b.direction === '去程' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'}`}>{b.direction}</span>
                    <span className="text-sm font-medium text-gray-700">{b.service_date} {b.service_time}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{b.id.slice(-8)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/org/bookings')}
                className="px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                返回列表
              </button>
              <button
                onClick={() => {
                  setResult(null)
                  setForm({ care_unit_id: 'cu-1', passenger_id: '', service_date: today, service_time: '08:00', pickup_address: '', dropoff_address: '', wheelchair: false, notes: '' })
                  setRoundTrip(false)
                  setDateMode('single')
                  setSelectedDays([])
                  setWeekStart(getMondayOf(today))
                }}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                再建一筆
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────
  return (
    <div>
      <TopBar title={isCopyMode ? '複製訂車' : '新增訂車'} subtitle={isCopyMode ? `複製自 #${copyFromId}，請確認並修改必要欄位` : '建立新的訂車紀錄'} />
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <Link href="/org/bookings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={15} />返回訂車管理
          </Link>

          {/* Copy mode banner */}
          {isCopyMode && (
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
              <Copy size={15} className="shrink-0" />
              <span>已複製原訂單資料，請確認或修改以下欄位後送出。服務日期已重設為今日，狀態將重設為「待指派」。</span>
            </div>
          )}

          {loadingCopy && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-green-600" />
            </div>
          )}

          {!loadingCopy && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800">訂車資訊</h3>
              </div>
              <div className="p-6 space-y-5">

                {/* Care unit */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">長照機構</label>
                  <select
                    value={form.care_unit_id}
                    onChange={e => setForm(f => ({ ...f, care_unit_id: e.target.value, passenger_id: '' }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {CARE_UNITS.map(cu => (
                      <option key={cu.id} value={cu.id}>{cu.name}</option>
                    ))}
                  </select>
                </div>

                {/* Passenger */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">服務個案 <span className="text-red-400">*</span></label>
                  <select
                    value={form.passenger_id}
                    onChange={e => handlePassengerChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">請選擇個案</option>
                    {filteredPassengers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.wheelchair ? ' ♿' : ''}</option>
                    ))}
                  </select>
                  {selectedPassenger?.wheelchair && (
                    <p className="text-xs text-orange-500 mt-1">♿ 此個案需要輪椅無障礙車輛</p>
                  )}
                </div>

                {/* ── Date mode toggle ── */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">服務日期模式</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDateMode('single')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${dateMode === 'single' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Calendar size={14} />單日
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateMode('multi')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${dateMode === 'multi' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <CalendarDays size={14} />多日（週選擇）
                    </button>
                  </div>
                </div>

                {/* Single date mode */}
                {dateMode === 'single' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">去程日期 <span className="text-red-400">*</span></label>
                      <input
                        type="date"
                        value={form.service_date}
                        onChange={e => { setForm(f => ({ ...f, service_date: e.target.value })); setReturnDate(e.target.value) }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">去程時間 <span className="text-red-400">*</span></label>
                      <input
                        type="time"
                        value={form.service_time}
                        onChange={e => setForm(f => ({ ...f, service_time: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                )}

                {/* Multi date mode */}
                {dateMode === 'multi' && (
                  <div className="rounded-xl border border-green-200 bg-green-50/30 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">參考週（週一起始）</label>
                        <input
                          type="date"
                          value={weekStart}
                          onChange={e => setWeekStart(getMondayOf(e.target.value))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">去程時間 <span className="text-red-400">*</span></label>
                        <input
                          type="time"
                          value={form.service_time}
                          onChange={e => setForm(f => ({ ...f, service_time: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">選擇服務日（可複選）<span className="text-red-400"> *</span></label>
                      <div className="grid grid-cols-7 gap-1.5">
                        {WEEKDAY_LABELS.map((label, offset) => {
                          const date = addDays(weekStart, offset)
                          const isSelected = selectedDays.includes(offset)
                          return (
                            <button
                              key={offset}
                              type="button"
                              onClick={() => toggleDay(offset)}
                              className={`flex flex-col items-center py-2 px-1 rounded-lg border text-xs font-medium transition-colors ${isSelected ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 bg-white hover:bg-green-50 hover:border-green-300'}`}
                            >
                              <span className="font-bold">{label}</span>
                              <span className={`mt-0.5 text-[10px] ${isSelected ? 'text-green-100' : 'text-gray-400'}`}>
                                {date.slice(5).replace('-', '/')}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {selectedDays.length > 0 && (
                      <div className="text-xs text-green-700 bg-green-100 rounded-lg px-3 py-2">
                        已選 {selectedDays.length} 天：{multiDates.map(d => `${d.label}（${d.date}）`).join('、')}
                      </div>
                    )}
                  </div>
                )}

                {/* Addresses */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">上車地址（去程）</label>
                  <input
                    type="text"
                    value={form.pickup_address}
                    onChange={e => setForm(f => ({ ...f, pickup_address: e.target.value }))}
                    placeholder="輸入上車地址"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">下車地址（去程）</label>
                  <input
                    type="text"
                    value={form.dropoff_address}
                    onChange={e => setForm(f => ({ ...f, dropoff_address: e.target.value }))}
                    placeholder="輸入下車地址"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Wheelchair */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, wheelchair: !f.wheelchair }))}
                    className={`w-10 h-6 rounded-full transition-colors relative ${form.wheelchair ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.wheelchair ? 'left-5' : 'left-1'}`}></span>
                  </button>
                  <label className="text-sm text-gray-700">需要輪椅無障礙車輛 ♿</label>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">備註（選填）</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="其他注意事項..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>

                {/* ── Round-trip toggle ── */}
                <div className={`rounded-xl border-2 transition-colors overflow-hidden ${roundTrip ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'}`}>
                  <button
                    type="button"
                    onClick={() => setRoundTrip(r => !r)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight size={16} className={roundTrip ? 'text-blue-600' : 'text-gray-400'} />
                      <span className={`text-sm font-semibold ${roundTrip ? 'text-blue-700' : 'text-gray-600'}`}>同時預約返程</span>
                      <span className="text-xs text-gray-400">（系統自動建立去程＋返程兩筆訂單）</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors relative ${roundTrip ? 'bg-blue-500' : 'bg-gray-200'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${roundTrip ? 'left-5' : 'left-1'}`}></span>
                    </div>
                  </button>

                  {roundTrip && (
                    <div className="px-4 pb-4 space-y-4 border-t border-blue-200">
                      <p className="text-xs text-blue-600 pt-3 font-medium">
                        返程將自動以「{form.dropoff_address || '下車地址'}」為上車地點，「{form.pickup_address || '上車地址'}」為下車地點。
                      </p>

                      {dateMode === 'single' ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">返程日期</label>
                            <input
                              type="date"
                              value={returnDate}
                              onChange={e => setReturnDate(e.target.value)}
                              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">返程時間 <span className="text-red-400">*</span></label>
                            <input
                              type="time"
                              value={returnTime}
                              onChange={e => setReturnTime(e.target.value)}
                              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-xs">
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">返程時間 <span className="text-red-400">*</span>（每日同一時段）</label>
                          <input
                            type="time"
                            value={returnTime}
                            onChange={e => setReturnTime(e.target.value)}
                            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          />
                          <p className="text-xs text-blue-500 mt-1">返程日期與去程相同（當日往返）</p>
                        </div>
                      )}

                      {/* Preview — single mode only */}
                      {dateMode === 'single' && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-green-100 rounded-lg px-3 py-2">
                            <p className="font-bold text-green-700 mb-1">去程</p>
                            <p className="text-green-600">{form.service_date} {form.service_time}</p>
                            <p className="text-green-600 truncate">{form.pickup_address || '—'} → {form.dropoff_address || '—'}</p>
                          </div>
                          <div className="bg-blue-100 rounded-lg px-3 py-2">
                            <p className="font-bold text-blue-700 mb-1">返程</p>
                            <p className="text-blue-600">{returnDate} {returnTime}</p>
                            <p className="text-blue-600 truncate">{form.dropoff_address || '—'} → {form.pickup_address || '—'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <Link
                    href="/org/bookings"
                    className="flex-1 py-2.5 text-sm font-medium text-center border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </Link>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex-1 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={15} className="animate-spin" />}
                    {submitLabel}
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
