'use client'
import { useState, useEffect, useCallback } from 'react'
import { PASSENGERS, VEHICLES } from '@/lib/db'
import { Search, Calendar, ChevronRight, History, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { BookingRecord, Driver } from '@/types'

type BookingWithVehicle = BookingRecord & { assigned_vehicle_id?: string }

const NAV_ITEMS = [
  { href: '/line/tasks',   icon: '📋', label: '任務' },
  { href: '/line/map',     icon: '🗺️', label: '地圖' },
  { href: '/line/record',  icon: '📝', label: '填寫' },
  { href: '/line/history', icon: '📅', label: '歷史' },
  { href: '/line/me',      icon: '👤', label: '我的' },
]

function toYMD(d: Date) {
  return d.toISOString().split('T')[0]
}

const STATUS_STYLES: Record<string, string> = {
  '已完成': 'bg-green-100 text-green-700',
  '取消':   'bg-red-100 text-red-500',
  '進行中': 'bg-orange-100 text-orange-600',
  '已指派': 'bg-blue-100 text-blue-600',
  '待指派': 'bg-gray-100 text-gray-500',
}

export default function LineHistoryPage() {
  const defaultEnd = toYMD(new Date())
  const defaultStart = toYMD(new Date(Date.now() - 30 * 86400000))

  const [driver, setDriver] = useState<Driver | null>(null)
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [bookings, setBookings] = useState<BookingWithVehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async (driverId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings?driver_id=${driverId}&start_date=${startDate}&end_date=${endDate}`)
      const json = await res.json()
      setBookings(json.data ?? [])
    } catch {
      setBookings([])
    }
    setLoading(false)
    setSearched(true)
  }, [startDate, endDate])

  useEffect(() => {
    fetch('/api/driver/me')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setDriver(d.data)
          doSearch(d.data.id)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 px-4 pt-12 pb-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <History size={18} />
          <h1 className="text-lg font-bold">歷史任務</h1>
        </div>
        <p className="text-green-100 text-sm">查詢已完成或過去的服務記錄</p>
      </div>

      {/* Date range picker */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-400 mb-1 block">開始日期</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
              <Calendar size={14} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={e => setStartDate(e.target.value)}
                className="flex-1 text-sm focus:outline-none min-w-0 bg-transparent"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
          <span className="text-gray-400 pb-2.5 shrink-0">—</span>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-400 mb-1 block">結束日期</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
              <Calendar size={14} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="flex-1 text-sm focus:outline-none min-w-0 bg-transparent"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
          <button
            onClick={() => driver && doSearch(driver.id)}
            disabled={loading || !driver}
            className="shrink-0 flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:bg-green-700 disabled:opacity-60"
          >
            {loading
              ? <RefreshCw size={15} className="animate-spin" />
              : <Search size={15} />
            }
            查詢
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 p-4 space-y-3 pb-24">
        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" />查詢中…
          </div>
        )}

        {!loading && searched && bookings.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <History size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">此區間無任務記錄</p>
            <p className="text-xs mt-1">試試調整查詢日期範圍</p>
          </div>
        )}

        {!loading && bookings.map(b => {
          const passenger = PASSENGERS.find(p => p.id === b.passenger_id)
          const vehicle = VEHICLES.find(v => v.id === b.assigned_vehicle_id)
          const statusStyle = STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-500'

          return (
            <Link
              key={b.id}
              href={`/line/history/${b.id}`}
              className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-transparent active:border-green-300 active:scale-[0.99] transition-transform"
            >
              <div className="px-4 py-3 flex items-center gap-3">
                {/* Date badge */}
                <div className="shrink-0 w-12 text-center">
                  <p className="text-xs text-gray-400 leading-tight">
                    {b.service_date.slice(5, 7)}/{b.service_date.slice(8, 10)}
                  </p>
                  <p className="text-sm font-bold text-gray-700">{b.service_time?.slice(0, 5) ?? '—'}</p>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {passenger?.name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {b.direction} · {vehicle?.plate_number ?? '—'}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5 truncate">
                    {b.pickup_address}
                  </p>
                </div>

                {/* Status + arrow */}
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
                    {b.status}
                  </span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
            </Link>
          )
        })}

        {!loading && bookings.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-2">共 {bookings.length} 筆記錄</p>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 flex z-50 shadow-lg">
        {NAV_ITEMS.map(item => (
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
