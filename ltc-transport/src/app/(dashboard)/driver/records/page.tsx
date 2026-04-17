'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Clock, MapPin, Ruler, RefreshCw, CheckCircle2, Navigation2 } from 'lucide-react'
import type { Driver } from '@/types'
import type { EnrichedBooking } from '@/lib/queries/bookings'

const today = new Date().toISOString().split('T')[0]

type BookingWithVehicle = EnrichedBooking

interface TaskEvent {
  pickup_time?: string
  pickup_lat?: number | null
  pickup_lng?: number | null
  dropoff_time?: string
  dropoff_lat?: number | null
  dropoff_lng?: number | null
}

interface FormData {
  actual_pickup_time: string
  actual_dropoff_time: string
  pickup_lat: number | null
  pickup_lng: number | null
  dropoff_lat: number | null
  dropoff_lng: number | null
  distance_km: string
  note: string
}

function loadTaskEvent(bookingId: string): TaskEvent {
  try {
    return JSON.parse(localStorage.getItem(`ltc_task_event_${bookingId}`) || '{}')
  } catch {
    return {}
  }
}

function fmtCoord(v: number | null | undefined): string {
  if (v == null) return '未取得'
  return v.toFixed(6)
}

export default function DriverRecordsPage() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [bookings, setBookings] = useState<BookingWithVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    actual_pickup_time: '',
    actual_dropoff_time: '',
    pickup_lat: null,
    pickup_lng: null,
    dropoff_lat: null,
    dropoff_lng: null,
    distance_km: '',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [filed, setFiled] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const loadBookings = useCallback(async (driverId: string) => {
    try {
      const res = await fetch(`/api/bookings?driver_id=${driverId}&start_date=${today}&end_date=${today}&status=已完成`)
      const json = await res.json()
      setBookings(json.data ?? [])
    } catch {
      setBookings([])
    }
  }, [])

  useEffect(() => {
    fetch('/api/driver/me')
      .then(r => r.json())
      .then(async d => {
        if (d.data) {
          setDriver(d.data)
          await loadBookings(d.data.id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [loadBookings])

  function selectBooking(bookingId: string) {
    const ev = loadTaskEvent(bookingId)
    setFormData({
      actual_pickup_time: ev.pickup_time ?? '',
      actual_dropoff_time: ev.dropoff_time ?? '',
      pickup_lat: ev.pickup_lat ?? null,
      pickup_lng: ev.pickup_lng ?? null,
      dropoff_lat: ev.dropoff_lat ?? null,
      dropoff_lng: ev.dropoff_lng ?? null,
      distance_km: '',
      note: '',
    })
    setSelectedId(bookingId)
    setError(null)
  }

  const selected = bookings.find(b => b.id === selectedId)
  const passenger = selected?.passenger ?? null

  async function handleSubmit() {
    if (!selected || !driver) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/service-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selected.id,
          care_unit_id: selected.care_unit_id,
          passenger_id: selected.passenger_id,
          driver_id: driver.id,
          vehicle_id: selected.assigned_vehicle_id ?? null,
          service_date: selected.service_date,
          service_time: selected.service_time,
          pickup_address: selected.pickup_address,
          dropoff_location: selected.dropoff_address,
          actual_pickup_time: formData.actual_pickup_time || null,
          actual_dropoff_time: formData.actual_dropoff_time || null,
          pickup_lat: formData.pickup_lat,
          pickup_lng: formData.pickup_lng,
          dropoff_lat: formData.dropoff_lat,
          dropoff_lng: formData.dropoff_lng,
          distance_km: formData.distance_km ? Number(formData.distance_km) : null,
          notes: formData.note || null,
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      // clear localStorage event after successful submit
      localStorage.removeItem(`ltc_task_event_${selected.id}`)
      setFiled(f => new Set([...f, selected.id]))
      setSubmitted(true)
      setSelectedId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗，請稍後再試')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div>
        <TopBar title="修改服務資料" subtitle="填寫完成任務的服務紀錄" />
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" />載入中…
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="修改服務資料" subtitle="填寫完成任務的服務紀錄" />
      <div className="p-6 space-y-4">

        {/* Success */}
        {submitted && (
          <div className="bg-white rounded-xl border border-green-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">服務明細已送出</p>
            <p className="text-sm text-gray-400 mb-4">紀錄已成功儲存</p>
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              繼續填寫
            </button>
          </div>
        )}

        {/* Select booking */}
        {!selectedId && !submitted && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">選擇任務填寫明細</h3>
            {bookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                {driver ? '今日沒有已完成的任務需要填寫' : '未找到駕駛資料，請確認帳號已綁定駕駛身份'}
              </p>
            ) : (
              <div className="space-y-2">
                {bookings.map(b => {
                  const p = b.passenger
                  const isFiled = filed.has(b.id)
                  const ev = loadTaskEvent(b.id)
                  const hasEvent = !!(ev.pickup_time || ev.dropoff_time)
                  return (
                    <div key={b.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-green-200 hover:bg-green-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">{p?.name ?? '—'} · {b.service_time} {b.direction}</p>
                        <p className="text-xs text-gray-400 truncate">{b.pickup_address}</p>
                        {hasEvent && (
                          <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                            <Clock size={10} />
                            {ev.pickup_time && `上車 ${ev.pickup_time}`}
                            {ev.pickup_time && ev.dropoff_time && ' · '}
                            {ev.dropoff_time && `下車 ${ev.dropoff_time}`}
                          </p>
                        )}
                      </div>
                      {isFiled ? (
                        <span className="text-xs text-green-600 font-medium px-3 py-1 bg-green-50 rounded-full border border-green-200 shrink-0 ml-2">已填寫</span>
                      ) : (
                        <button
                          onClick={() => selectBooking(b.id)}
                          className="text-xs font-medium px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shrink-0 ml-2"
                        >
                          填寫
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Fill form */}
        {selectedId && !submitted && selected && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-green-50">
              <h3 className="font-semibold text-gray-800">填寫服務明細</h3>
              <p className="text-xs text-gray-500 mt-0.5">{passenger?.name ?? '—'} · {selected.service_time} · {selected.direction}</p>
            </div>
            <div className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              {/* Addresses */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={14} className="text-green-600 mt-0.5 shrink-0" />
                  <span>{selected.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={14} className="text-blue-600 mt-0.5 shrink-0" />
                  <span>{selected.dropoff_address}</span>
                </div>
              </div>

              {/* Pickup time + coords */}
              <div className="rounded-xl border border-green-200 bg-green-50/40 overflow-hidden">
                <div className="px-4 py-2 bg-green-100 flex items-center gap-1.5">
                  <Navigation2 size={13} className="text-green-700" />
                  <span className="text-xs font-semibold text-green-800">上車資訊（開始服務時記錄）</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <Clock size={11} className="inline mr-1" />實際上車時間
                    </label>
                    <input
                      type="time"
                      value={formData.actual_pickup_time}
                      onChange={e => setFormData(f => ({ ...f, actual_pickup_time: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    />
                    {!formData.actual_pickup_time && (
                      <p className="text-xs text-yellow-600 mt-1">尚未記錄，請點選「開始接送」後系統自動帶入</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <MapPin size={11} className="inline mr-1 text-green-600" />上車緯度
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={fmtCoord(formData.pickup_lat)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 font-mono cursor-default"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <MapPin size={11} className="inline mr-1 text-green-600" />上車經度
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={fmtCoord(formData.pickup_lng)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 font-mono cursor-default"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dropoff time + coords */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 overflow-hidden">
                <div className="px-4 py-2 bg-blue-100 flex items-center gap-1.5">
                  <Navigation2 size={13} className="text-blue-700" />
                  <span className="text-xs font-semibold text-blue-800">下車資訊（完成任務時記錄）</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <Clock size={11} className="inline mr-1" />實際下車時間
                    </label>
                    <input
                      type="time"
                      value={formData.actual_dropoff_time}
                      onChange={e => setFormData(f => ({ ...f, actual_dropoff_time: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                    {!formData.actual_dropoff_time && (
                      <p className="text-xs text-yellow-600 mt-1">尚未記錄，請點選「完成任務」後系統自動帶入</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <MapPin size={11} className="inline mr-1 text-blue-600" />下車緯度
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={fmtCoord(formData.dropoff_lat)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 font-mono cursor-default"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <MapPin size={11} className="inline mr-1 text-blue-600" />下車經度
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={fmtCoord(formData.dropoff_lng)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 font-mono cursor-default"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Distance */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  <Ruler size={12} className="inline mr-1" />行駛里程（公里）
                </label>
                <input
                  type="number" step="0.1" min="0" placeholder="例：5.3"
                  value={formData.distance_km}
                  onChange={e => setFormData(f => ({ ...f, distance_km: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">備註（選填）</label>
                <textarea
                  rows={3}
                  placeholder="如：乘客身體狀況、特殊情況說明..."
                  value={formData.note}
                  onChange={e => setFormData(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setSelectedId(null); setError(null) }}
                  className="flex-1 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}確認送出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
