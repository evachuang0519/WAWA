'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VEHICLES } from '@/lib/db'
import { Phone, Car, LogOut, ChevronRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { Driver } from '@/types'

const today = new Date().toISOString().split('T')[0]

type BookingWithVehicle = { id: string; assigned_vehicle_id?: string }

export default function LineMePage() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [todayTrips, setTodayTrips] = useState(0)
  const [vehicleId, setVehicleId] = useState<string | undefined>()
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
            const trips: BookingWithVehicle[] = json.data ?? []
            setTodayTrips(trips.length)
            setVehicleId(trips[0]?.assigned_vehicle_id)
            setLoading(false)
          })
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/line/login')
  }

  const vehicle = VEHICLES.find(v => v.id === vehicleId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-400">
        <RefreshCw size={24} className="animate-spin mr-2" />載入中…
      </div>
    )
  }

  const displayName = driver?.name ?? '未登入'
  const companyName = driver?.company_id ? '車行' : '未知車行'

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-green-600 px-4 pt-12 pb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {displayName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            <p className="text-green-100 text-sm">駕駛 · {companyName}</p>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-4 space-y-3 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{todayTrips}</p>
            <p className="text-xs text-gray-400 mt-0.5">今日趟次</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-lg font-bold text-blue-600">{vehicle?.plate_number ?? '未指派'}</p>
            <p className="text-xs text-gray-400 mt-0.5">使用車輛</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {[
            { icon: <Phone size={18} className="text-green-600" />, label: '聯絡電話', value: driver?.phone ?? '—' },
            { icon: <Car size={18} className="text-blue-600" />, label: '使用車輛', value: vehicle ? `${vehicle.plate_number} ${vehicle.brand} ${vehicle.model}` : '未指派' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0">
              {item.icon}
              <div className="flex-1">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-gray-800">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Links */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {[
            { label: '完整後台（桌面版）', href: '/dashboard' },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 active:bg-gray-50">
              <span className="flex-1 text-sm text-gray-700">{item.label}</span>
              <ChevronRight size={16} className="text-gray-300" />
            </Link>
          ))}
        </div>

        {/* Driver details */}
        {driver && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs text-gray-400">駕照號碼</p>
              <p className="text-sm font-medium text-gray-800">{driver.license_number ?? '—'}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">駕照效期</p>
              <p className="text-sm font-medium text-gray-800">{driver.license_expiry ?? '—'}</p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white text-red-500 font-semibold rounded-2xl shadow-sm active:bg-red-50">
          <LogOut size={18} />登出
        </button>
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 flex z-50 shadow-lg">
        {[
          { href: '/line/tasks',   icon: '📋', label: '任務' },
          { href: '/line/map',     icon: '🗺️', label: '地圖' },
          { href: '/line/record',  icon: '📝', label: '填寫' },
          { href: '/line/history', icon: '📅', label: '歷史' },
          { href: '/line/me',      icon: '👤', label: '我的' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium ${item.href === '/line/me' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
