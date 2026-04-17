'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { PASSENGERS, VEHICLES, CARE_UNITS, TASK_ASSIGNMENTS } from '@/lib/db'
import {
  MapPin, Phone, Navigation2, Clock, CheckCircle2,
  XCircle, ChevronLeft, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import type { BookingRecord } from '@/types'

interface GpsEvent {
  id: string
  event_type: string
  lat?: number
  lng?: number
  timestamp: string
  note?: string
}

const EVENT_LABELS: Record<string, string> = {
  arrived:   '抵達上車點',
  started:   '開始接送',
  completed: '結束任務',
  cancelled: '已取消',
}

const EVENT_COLORS: Record<string, string> = {
  arrived:   'text-blue-600',
  started:   'text-orange-600',
  completed: 'text-green-600',
  cancelled: 'text-red-500',
}

const STATUS_STYLES: Record<string, string> = {
  '已完成': 'bg-green-100 text-green-700',
  '取消':   'bg-red-100 text-red-600',
  '進行中': 'bg-orange-100 text-orange-600',
  '已指派': 'bg-blue-100 text-blue-600',
  '待指派': 'bg-gray-100 text-gray-500',
}

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [booking, setBooking] = useState<BookingRecord | null>(null)
  const [events, setEvents] = useState<GpsEvent[]>([])
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then(r => r.json())
      .then(d => setBooking(d.data ?? null))
      .catch(() => setLoadError(true))

    fetch(`/api/bookings/${id}/events`)
      .then(r => r.json())
      .then(d => setEvents(d.data ?? []))
      .catch(() => {})
  }, [id])

  const passenger = booking ? PASSENGERS.find(p => p.id === booking.passenger_id) : null
  const task = TASK_ASSIGNMENTS.find(t => t.booking_id === id)
  const vehicle = VEHICLES.find(v => v.id === task?.vehicle_id)
  const cu = booking ? CARE_UNITS.find(c => c.id === booking.care_unit_id) : null
  const statusStyle = booking ? (STATUS_STYLES[booking.status] ?? 'bg-gray-100 text-gray-500') : ''

  if (loadError) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center gap-4 p-8">
        <AlertTriangle size={40} className="text-red-400" />
        <p className="text-gray-600 font-medium">無法載入任務資料</p>
        <button onClick={() => router.back()} className="text-green-600 text-sm underline">返回</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 px-4 pt-12 pb-5 text-white">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-green-100 text-sm mb-3 active:opacity-70"
        >
          <ChevronLeft size={16} />返回歷史記錄
        </button>
        {booking ? (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{passenger?.name ?? '—'}</h1>
              <p className="text-green-100 text-sm mt-0.5">
                {booking.service_date} {booking.service_time} · {booking.direction}
              </p>
            </div>
            <span className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold ${statusStyle}`}>
              {booking.status}
            </span>
          </div>
        ) : (
          <div className="h-12 flex items-center">
            <div className="w-32 h-5 bg-white/20 rounded animate-pulse" />
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-3 pb-24">
        {/* Skeleton while loading */}
        {!booking && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Passenger card */}
        {booking && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">乘客資訊</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-base">{passenger?.name ?? '—'}</p>
                  {booking.wheelchair && (
                    <p className="text-xs text-orange-500 mt-0.5">♿ 輪椅無障礙</p>
                  )}
                </div>
                {passenger?.phone && (
                  <a
                    href={`tel:${passenger.phone}`}
                    className="shrink-0 flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-sm font-medium active:bg-green-100"
                  >
                    <Phone size={14} />{passenger.phone}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-gray-400">🚌</span>
                {vehicle?.plate_number ?? '未指派'} · {cu?.short_name ?? '—'}
              </div>
            </div>
          </div>
        )}

        {/* Route card */}
        {booking && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">行程路線</p>
            </div>
            <div className="p-4 space-y-3">
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">上車地點</p>
                  <p className="text-sm font-medium text-gray-800 break-words">{booking.pickup_address ?? '—'}</p>
                </div>
                {booking.pickup_address && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.pickup_address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-2 rounded-xl text-xs font-medium active:bg-blue-100"
                  >
                    <Navigation2 size={12} />導航
                  </a>
                )}
              </div>
              <div className="ml-4 border-l-2 border-dashed border-gray-200 h-4" />
              {/* Dropoff */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">下車地點</p>
                  <p className="text-sm font-medium text-gray-800 break-words">{booking.dropoff_address ?? '—'}</p>
                </div>
                {booking.dropoff_address && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.dropoff_address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-2 rounded-xl text-xs font-medium active:bg-blue-100"
                  >
                    <Navigation2 size={12} />導航
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Event timeline */}
        {events.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">任務記錄</p>
            </div>
            <div className="p-4 space-y-3">
              {events.map(evt => (
                <div key={evt.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    evt.event_type === 'completed' ? 'bg-green-500' :
                    evt.event_type === 'cancelled' ? 'bg-red-400' :
                    evt.event_type === 'started'   ? 'bg-orange-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${EVENT_COLORS[evt.event_type] ?? 'text-gray-700'}`}>
                      {EVENT_LABELS[evt.event_type] ?? evt.event_type}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(evt.timestamp).toLocaleString('zh-TW', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {evt.lat && evt.lng && (
                        <span className="text-xs text-gray-400">
                          📍 {evt.lat.toFixed(5)}, {evt.lng.toFixed(5)}
                        </span>
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
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 break-words">
            📝 {booking.notes}
          </div>
        )}

        {/* Completion indicator */}
        {booking?.status === '已完成' && (
          <div className="flex items-center justify-center gap-2 py-4 text-green-600 font-semibold bg-green-50 rounded-2xl">
            <CheckCircle2 size={20} />任務已完成
          </div>
        )}
        {booking?.status === '取消' && (
          <div className="flex items-center justify-center gap-2 py-4 text-gray-500 font-semibold bg-gray-50 rounded-2xl">
            <XCircle size={20} />任務已取消
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 flex z-50 shadow-lg">
        {[
          { href: '/line/tasks',   icon: '📋', label: '任務' },
          { href: '/line/map',     icon: '🗺️', label: '地圖' },
          { href: '/line/record',  icon: '📝', label: '填寫' },
          { href: '/line/history', icon: '📅', label: '歷史' },
          { href: '/line/me',      icon: '👤', label: '我的' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-colors ${item.href === '/line/history' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
