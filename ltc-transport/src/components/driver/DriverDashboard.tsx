'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import {
  CheckCircle2, Clock, AlertTriangle, Car, MapPin,
  ArrowRight, RefreshCw, Calendar, IdCard, Shield,
  ChevronRight,
} from 'lucide-react'
import type { Driver } from '@/types'
import type { AuthUser } from '@/types'
import type { EnrichedBooking } from '@/lib/queries/bookings'

type BookingWithVehicle = EnrichedBooking

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-gray-400">未設定</span>
  if (days < 0) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">已到期</span>
  if (days < 30) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">{days} 天後</span>
  if (days < 90) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{days} 天後</span>
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{days} 天後</span>
}

export default function DriverDashboard({ user }: { user: AuthUser }) {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [tasks, setTasks] = useState<BookingWithVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]
  const todayDate = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  useEffect(() => {
    async function load() {
      try {
        const dRes = await fetch('/api/driver/me')
        const dJson = await dRes.json()
        if (!dJson.data) { setLoading(false); return }
        const d: Driver = dJson.data
        setDriver(d)

        const bRes = await fetch(`/api/bookings?driver_id=${d.id}&start_date=${today}&end_date=${today}`)
        const bJson = await bRes.json()
        const list: BookingWithVehicle[] = (bJson.data ?? []).sort(
          (a: BookingWithVehicle, b: BookingWithVehicle) =>
            (a.service_time ?? '').localeCompare(b.service_time ?? '')
        )
        setTasks(list)
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [today])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <RefreshCw size={20} className="animate-spin mr-2" />載入中…
      </div>
    )
  }

  const completed = tasks.filter(t => t.status === '已完成').length
  const inProgress = tasks.filter(t => t.status === '進行中').length
  const pending = tasks.filter(t => t.status === '已指派').length

  const vehicle = tasks[0]?.vehicle

  const licDays = daysUntil(driver?.license_expiry)
  const healthDays = daysUntil(driver?.health_cert_expiry)

  return (
    <div className="p-6 space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-1">早安，{user.name} 👋</h2>
        <p className="text-green-100 text-sm">{todayDate}</p>
        <p className="text-green-100 text-sm mt-1">
          今日共 {tasks.length} 趟任務
          {completed > 0 && `，已完成 ${completed} 趟`}
          {inProgress > 0 && `，進行中 ${inProgress} 趟`}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-gray-800">{tasks.length}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <Calendar size={11} />今日趟次
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{completed}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 size={11} />已完成
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-yellow-500">{pending + inProgress}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <Clock size={11} />待執行
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's task list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">今日任務清單</h3>
            <button
              onClick={() => router.push('/driver/tasks')}
              className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
            >
              前往操作 <ChevronRight size={12} />
            </button>
          </div>
          {tasks.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400">
              <Calendar size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">今日沒有任務</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tasks.map(b => {
                const passenger = b.passenger
                const cu = b.care_unit
                return (
                  <div key={b.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="shrink-0 text-center w-12">
                      <p className="text-sm font-bold text-gray-800">{b.service_time}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        b.direction === '去程' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {b.direction}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{passenger?.name ?? '—'}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <MapPin size={10} className="text-green-400 shrink-0" />
                        <span className="truncate">{b.pickup_address}</span>
                        <ArrowRight size={9} className="text-gray-300 shrink-0" />
                        <MapPin size={10} className="text-red-400 shrink-0" />
                        <span className="truncate">{b.dropoff_address}</span>
                      </div>
                      {cu && <p className="text-xs text-gray-400 mt-0.5">{cu.short_name}</p>}
                    </div>
                    <div className="shrink-0">
                      <Badge value={b.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right panel: vehicle + expiry */}
        <div className="space-y-4">
          {/* Today's vehicle */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Car size={16} className="text-green-500" />今日車輛
            </h3>
            {vehicle ? (
              <div className="space-y-1.5">
                <p className="text-lg font-bold text-gray-900">{vehicle.plate_number}</p>
                <p className="text-sm text-gray-600">{vehicle.brand} {vehicle.model}</p>
                <p className="text-xs text-gray-400">
                  {vehicle.type === 'wheelchair_van' ? '無障礙廂型車' :
                   vehicle.type === 'van' ? '廂型車' :
                   vehicle.type === 'sedan' ? '轎車' : vehicle.type}
                  {vehicle.wheelchair_slots ? ` · 輪椅位 ${vehicle.wheelchair_slots}` : ''}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">尚未指派車輛</p>
            )}
          </div>

          {/* Expiry alerts */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" />證件到期提醒
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <IdCard size={14} className="text-blue-400" />駕照
                </div>
                <div className="text-right">
                  <ExpiryBadge days={licDays} />
                  {driver?.license_expiry && (
                    <p className="text-xs text-gray-400 mt-0.5">{driver.license_expiry}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Shield size={14} className="text-green-400" />健康證明
                </div>
                <div className="text-right">
                  <ExpiryBadge days={healthDays} />
                  {driver?.health_cert_expiry && (
                    <p className="text-xs text-gray-400 mt-0.5">{driver.health_cert_expiry}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
