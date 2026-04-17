'use client'
import { useState, useEffect } from 'react'
import { PASSENGERS, VEHICLES, CARE_UNITS } from '@/lib/db'
import { Navigation2, CheckCircle2, Clock, ChevronRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { BookingRecord, Driver } from '@/types'

const today = new Date().toISOString().split('T')[0]

type BookingWithVehicle = BookingRecord & { assigned_vehicle_id?: string }

export default function LineTasksPage() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [tasks, setTasks] = useState<BookingWithVehicle[]>([])
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/driver/me')
      .then(r => r.json())
      .then(d => {
        if (!d.data) { setLoading(false); return }
        setDriver(d.data)
        return fetch(`/api/bookings?driver_id=${d.data.id}&start_date=${today}&end_date=${today}`)
          .then(r => r.json())
          .then(json => {
            const all: BookingWithVehicle[] = json.data ?? []
            setTasks(all.sort((a, b) => (a.service_time ?? '').localeCompare(b.service_time ?? '')))
            setLoading(false)
          })
      })
      .catch(() => setLoading(false))

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true }
      )
    }
  }, [])

  const completed = tasks.filter(t => t.status === '已完成').length
  const total = tasks.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-400">
        <RefreshCw size={24} className="animate-spin mr-2" />載入中…
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 px-4 pt-12 pb-5 text-white">
        <p className="text-green-100 text-sm">今日 {today}</p>
        <h1 className="text-2xl font-bold mt-0.5">我的任務</h1>
        <div className="flex items-center gap-4 mt-3">
          <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold">{total}</p>
            <p className="text-xs text-green-100">今日趟次</p>
          </div>
          <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold">{completed}</p>
            <p className="text-xs text-green-100">已完成</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl px-3 py-2">
            <div className="flex justify-between text-xs text-green-100 mb-1">
              <span>完成率</span>
              <span>{total ? Math.round((completed / total) * 100) : 0}%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
        {gps && (
          <div className="flex items-center gap-1 mt-2 text-xs text-green-100">
            <Navigation2 size={11} className="animate-pulse" />
            GPS {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
          </div>
        )}
      </div>

      {/* Task cards */}
      <div className="flex-1 p-4 space-y-3 pb-24">
        {!driver && (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">未找到駕駛資料</p>
            <p className="text-xs mt-1">請確認帳號已綁定駕駛身份</p>
          </div>
        )}
        {driver && tasks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">今日沒有任務</p>
          </div>
        )}
        {tasks.map((b, i) => {
          const passenger = PASSENGERS.find(p => p.id === b.passenger_id)
          const vehicle = VEHICLES.find(v => v.id === b.assigned_vehicle_id)
          const cu = CARE_UNITS.find(c => c.id === b.care_unit_id)
          const isDone = b.status === '已完成' || b.status === '取消'
          const isActive = b.status === '進行中'

          return (
            <Link
              key={b.id}
              href={`/line/tasks/${b.id}`}
              className={`block bg-white rounded-2xl overflow-hidden shadow-sm border transition-all active:scale-98 ${isActive ? 'border-green-400 shadow-green-100 shadow-md' : 'border-transparent'}`}
            >
              <div className={`px-4 py-3 flex items-center gap-3 ${isDone ? 'bg-gray-50' : isActive ? 'bg-green-50' : 'bg-white'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDone ? 'bg-gray-200 text-gray-500' : isActive ? 'bg-green-500 text-white' : 'bg-orange-400 text-white'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />{b.service_time}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${b.direction === '去程' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{b.direction}</span>
                  </p>
                  <p className="text-xs text-gray-400">{vehicle?.plate_number ?? '—'} · {cu?.short_name ?? '—'}</p>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full font-medium ${isDone ? 'bg-gray-100 text-gray-500' : isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {b.status}
                </div>
                <ChevronRight size={16} className="text-gray-300 ml-1" />
              </div>

              <div className="px-4 py-3 border-t border-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{passenger?.name ?? '—'}</p>
                    {b.wheelchair && <p className="text-xs text-orange-500 mt-0.5">♿ 輪椅</p>}
                  </div>
                  <div className="text-right text-xs text-gray-400 space-y-0.5">
                    <p>{b.pickup_address?.slice(0, 12)}{(b.pickup_address?.length ?? 0) > 12 ? '…' : ''}</p>
                    <p>→ {b.dropoff_address?.slice(0, 10)}{(b.dropoff_address?.length ?? 0) > 10 ? '…' : ''}</p>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
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
            className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-colors ${item.href === '/line/tasks' ? 'text-green-600' : 'text-gray-400 active:text-gray-600'}`}
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
