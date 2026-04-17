'use client'
import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { PASSENGERS, VEHICLES, CARE_UNITS } from '@/lib/db'
import {
  MapPin, Phone, Navigation2, Clock, CheckCircle2,
  XCircle, AlertTriangle, Locate, ChevronLeft, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import type { BookingRecord } from '@/types'

interface GpsEvent {
  id: string
  event_type: string
  lat?: number
  lng?: number
  timestamp: string
}

interface Gps { lat: number; lng: number; accuracy?: number }

function GpsTag({ gps }: { gps: Gps | null }) {
  if (!gps) return <span className="text-xs text-gray-400">定位中…</span>
  return (
    <span className="text-xs text-green-600 flex items-center gap-1">
      <Locate size={11} className="animate-pulse" />
      {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
      {gps.accuracy ? ` ±${Math.round(gps.accuracy)}m` : ''}
    </span>
  )
}

const EVENT_LABELS: Record<string, string> = {
  arrived: '抵達上車點',
  started: '開始接送',
  completed: '結束任務',
  cancelled: '已取消',
}

const EVENT_COLORS: Record<string, string> = {
  arrived: 'text-blue-600',
  started: 'text-orange-600',
  completed: 'text-green-600',
  cancelled: 'text-red-500',
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [driverId, setDriverId] = useState<string | null>(null)
  const [booking, setBooking] = useState<BookingRecord | null>(null)
  const [events, setEvents] = useState<GpsEvent[]>([])
  const [gps, setGps] = useState<Gps | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const watchId = useRef<number | null>(null)

  // Load driver ID from session
  useEffect(() => {
    fetch('/api/driver/me').then(r => r.json()).then(d => {
      if (d.data?.id) setDriverId(d.data.id)
    }).catch(() => {})
  }, [])

  // Load booking
  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then(r => r.json())
      .then(d => setBooking(d.data ?? null))
      .catch(() => setError('無法載入任務'))
  }, [id])

  // Load events
  const loadEvents = () => {
    fetch(`/api/bookings/${id}/events`)
      .then(r => r.json())
      .then(d => setEvents(d.data ?? []))
      .catch(() => {})
  }
  useEffect(() => { loadEvents() }, [id])

  // Watch GPS
  useEffect(() => {
    if (!navigator.geolocation) return
    watchId.current = navigator.geolocation.watchPosition(
      pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  async function recordEvent(eventType: string) {
    setActing(eventType)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          lat: gps?.lat,
          lng: gps?.lng,
          accuracy: gps?.accuracy,
          driver_id: driverId,
        }),
      })
      if (!res.ok) throw new Error('記錄失敗')
      loadEvents()
      // Refresh booking status
      const bRes = await fetch(`/api/bookings/${id}`)
      const bData = await bRes.json()
      setBooking(bData.data ?? booking)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗')
    }
    setActing(null)
    setShowCancel(false)
  }

  const passenger = booking ? PASSENGERS.find(p => p.id === booking.passenger_id) : null
  // vehicle_id comes from task_assignment; use booking's assigned_vehicle_id if available
  const assignedVehicleId = (booking as (BookingRecord & { assigned_vehicle_id?: string }) | null)?.assigned_vehicle_id
  const vehicle = VEHICLES.find(v => v.id === assignedVehicleId)
  const cu = booking ? CARE_UNITS.find(c => c.id === booking.care_unit_id) : null

  // Determine available actions based on current status
  const status = booking?.status
  const hasEvent = (type: string) => events.some(e => e.event_type === type)

  const showArrived = status === '已指派' && !hasEvent('arrived')
  const showStarted = (status === '已指派' || status === '進行中') && hasEvent('arrived') && !hasEvent('started')
  const showCompleted = status === '進行中' && hasEvent('started') && !hasEvent('completed')
  const isDone = status === '已完成' || hasEvent('completed')
  const isCancelled = status === '取消' || hasEvent('cancelled')
  const canCancel = !isDone && !isCancelled

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 px-4 pt-12 pb-5 text-white">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-green-100 text-sm mb-3 active:opacity-70">
          <ChevronLeft size={16} />返回任務列表
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{passenger?.name ?? '—'}</h1>
            <p className="text-green-100 text-sm mt-0.5">{booking?.service_date} {booking?.service_time} · {booking?.direction}</p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
            isDone ? 'bg-gray-100 text-gray-600' :
            isCancelled ? 'bg-red-100 text-red-700' :
            status === '進行中' ? 'bg-white text-green-700' :
            'bg-white/20 text-white'
          }`}>
            {status}
          </span>
        </div>
        <div className="mt-2">
          <GpsTag gps={gps} />
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 pb-32">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            <AlertTriangle size={16} />{error}
          </div>
        )}

        {/* Passenger card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">乘客資訊</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-base">{passenger?.name}</p>
                {booking?.wheelchair && <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1">♿ 需輪椅無障礙車</p>}
              </div>
              {passenger?.phone && (
                <a
                  href={`tel:${passenger.phone}`}
                  className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-sm font-medium active:bg-green-100"
                >
                  <Phone size={14} />{passenger.phone}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-gray-400">🚌</span>{vehicle?.plate_number ?? '未指派'} · {cu?.short_name}
            </div>
          </div>
        </div>

        {/* Route card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">行程路線</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-0.5">上車地點</p>
                <p className="text-sm font-medium text-gray-800">{booking?.pickup_address ?? '—'}</p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking?.pickup_address ?? '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-xs font-medium active:bg-blue-100"
              >
                <Navigation2 size={13} />導航
              </a>
            </div>

            <div className="ml-4 border-l-2 border-dashed border-gray-200 h-5" />

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={14} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-0.5">下車地點</p>
                <p className="text-sm font-medium text-gray-800">{booking?.dropoff_address ?? '—'}</p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking?.dropoff_address ?? '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-xs font-medium active:bg-blue-100"
              >
                <Navigation2 size={13} />導航
              </a>
            </div>
          </div>
        </div>

        {/* Event timeline */}
        {events.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">任務記錄</p>
            </div>
            <div className="p-4 space-y-3">
              {events.map(evt => (
                <div key={evt.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${EVENT_COLORS[evt.event_type] ?? 'text-gray-700'}`}>
                      {EVENT_LABELS[evt.event_type] ?? evt.event_type}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />{new Date(evt.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {evt.lat && evt.lng && (
                        <span className="text-xs text-gray-400">
                          📍 {evt.lat.toFixed(5)}, {evt.lng.toFixed(5)}
                        </span>
                      )}
                      {!evt.lat && (
                        <span className="text-xs text-gray-300">無 GPS 資訊</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {booking?.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
            📝 {booking.notes}
          </div>
        )}
      </div>

      {/* Action buttons — fixed bottom */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 p-4 z-50 space-y-2 shadow-xl">
        {isDone && (
          <div className="flex items-center justify-center gap-2 py-4 text-green-600 font-semibold">
            <CheckCircle2 size={20} />任務已完成
          </div>
        )}
        {isCancelled && (
          <div className="flex items-center justify-center gap-2 py-4 text-gray-500 font-semibold">
            <XCircle size={20} />任務已取消
          </div>
        )}

        {!isDone && !isCancelled && (
          <>
            {showArrived && (
              <button
                onClick={() => recordEvent('arrived')}
                disabled={!!acting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-bold rounded-2xl active:scale-98 shadow-lg shadow-blue-200 disabled:opacity-60"
              >
                {acting === 'arrived' ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                抵達上車點
                {gps && <span className="text-xs font-normal opacity-80 ml-1">📍記錄GPS</span>}
              </button>
            )}
            {showStarted && (
              <button
                onClick={() => recordEvent('started')}
                disabled={!!acting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-500 text-white font-bold rounded-2xl active:scale-98 shadow-lg shadow-orange-200 disabled:opacity-60"
              >
                {acting === 'started' ? <Loader2 size={18} className="animate-spin" /> : <Navigation2 size={18} />}
                開始接送
                {gps && <span className="text-xs font-normal opacity-80 ml-1">📍記錄GPS</span>}
              </button>
            )}
            {showCompleted && (
              <button
                onClick={() => recordEvent('completed')}
                disabled={!!acting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white font-bold rounded-2xl active:scale-98 shadow-lg shadow-green-200 disabled:opacity-60"
              >
                {acting === 'completed' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                結束任務
                {gps && <span className="text-xs font-normal opacity-80 ml-1">📍記錄GPS</span>}
              </button>
            )}
            {canCancel && (
              <>
                {!showCancel ? (
                  <button
                    onClick={() => setShowCancel(true)}
                    className="w-full py-3 text-red-500 font-medium text-sm border border-red-200 rounded-2xl bg-white active:bg-red-50"
                  >
                    取消任務
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-red-700 text-center flex items-center justify-center gap-2">
                      <AlertTriangle size={16} />確認取消此任務？
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCancel(false)}
                        className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 font-medium text-sm rounded-xl active:bg-gray-50"
                      >
                        返回
                      </button>
                      <button
                        onClick={() => recordEvent('cancelled')}
                        disabled={!!acting}
                        className="flex-1 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl active:bg-red-700 disabled:opacity-60"
                      >
                        {acting === 'cancelled' ? <Loader2 size={14} className="animate-spin mx-auto" /> : '確認取消'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
