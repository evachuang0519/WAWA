'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import {
  MapPin, Clock, Navigation, Phone, RefreshCw,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Car, User, Building2, Hash, FileText, ArrowRight,
} from 'lucide-react'
import type { BookingRecord, Driver } from '@/types'
import type { EnrichedBooking } from '@/lib/queries/bookings'

const today = new Date().toISOString().split('T')[0]

type BookingWithVehicle = EnrichedBooking

export default function DriverTasksPage() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [tasks, setTasks] = useState<BookingWithVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const loadTasks = useCallback(async (driverId: string) => {
    try {
      const res = await fetch(`/api/bookings?driver_id=${driverId}&start_date=${today}&end_date=${today}`)
      const json = await res.json()
      const all: BookingWithVehicle[] = json.data ?? []
      setTasks(all.sort((a, b) => (a.service_time ?? '').localeCompare(b.service_time ?? '')))
    } catch {
      setTasks([])
    }
  }, [])

  useEffect(() => {
    fetch('/api/driver/me')
      .then(r => r.json())
      .then(async d => {
        if (d.data) {
          setDriver(d.data)
          await loadTasks(d.data.id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [loadTasks])

  async function captureGPS(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) return null
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 6000, maximumAge: 0 }
      )
    })
  }

  async function handleAction(e: React.MouseEvent, bookingId: string, currentStatus: string) {
    e.stopPropagation()
    const nextStatus = currentStatus === '進行中' ? '已完成' : '進行中'
    const isStarting = nextStatus === '進行中'
    setActionLoading(bookingId)

    // 1. 記錄時間
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // 2. 取得 GPS（最多等 6 秒，失敗不阻擋流程）
    const gps = await captureGPS()

    // 3. 寫入 localStorage（與服務明細頁共享）
    const storageKey = `ltc_task_event_${bookingId}`
    const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
    if (isStarting) {
      localStorage.setItem(storageKey, JSON.stringify({
        ...existing,
        pickup_time: timeStr,
        pickup_lat: gps?.lat ?? null,
        pickup_lng: gps?.lng ?? null,
      }))
    } else {
      localStorage.setItem(storageKey, JSON.stringify({
        ...existing,
        dropoff_time: timeStr,
        dropoff_lat: gps?.lat ?? null,
        dropoff_lng: gps?.lng ?? null,
      }))
    }

    // 4. 推送 GPS 到伺服器（不阻擋主流程）
    if (gps) {
      const task = tasks.find(t => t.id === bookingId)
      fetch('/api/fleet/gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: gps.lat,
          lng: gps.lng,
          vehicle_id: task?.assigned_vehicle_id,
        }),
      }).catch(() => {/* 忽略推送失敗 */})
    }

    // 5. PATCH 訂單狀態
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTasks(prev => prev.map(t => t.id === bookingId ? { ...t, status: nextStatus } : t))
      const gpsNote = gps ? '' : '（GPS 未取得）'
      showToast(isStarting ? `已開始接送 ${gpsNote}` : `任務已完成 ${gpsNote}`, true)
    } catch (e) {
      showToast((e as Error).message || '操作失敗', false)
    }
    setActionLoading(null)
  }

  function openNavigation(e: React.MouseEvent, address: string) {
    e.stopPropagation()
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank')
  }

  const completed = tasks.filter(t => t.status === '已完成').length

  if (loading) {
    return (
      <div>
        <TopBar title="今日任務" subtitle={`今日出行任務 (${today})`} />
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" />載入中…
        </div>
      </div>
    )
  }

  if (!driver) {
    return (
      <div>
        <TopBar title="今日任務" subtitle={`今日出行任務 (${today})`} />
        <div className="p-6 text-center text-gray-400 py-16">
          <p className="font-medium mb-1">未找到駕駛資料</p>
          <p className="text-sm">請確認帳號已綁定駕駛身份</p>
        </div>
      </div>
    )
  }

  const vehiclePlate = tasks[0]?.vehicle?.plate_number ?? '未指派'

  return (
    <div>
      <TopBar title="今日任務" subtitle={`今日出行任務 (${today})`} />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="p-6 space-y-4">

        {/* Driver status card */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-green-100 text-sm">今日服務</p>
              <p className="text-3xl font-bold">{tasks.length} <span className="text-lg font-normal text-green-100">趟次</span></p>
            </div>
            <div className="text-right">
              <p className="text-green-100 text-sm">使用車輛</p>
              <p className="text-lg font-bold">{vehiclePlate}</p>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1"><Clock size={14} />首趟 {tasks[0]?.service_time || '—'}</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={14} />{completed} / {tasks.length} 已完成</span>
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-12 text-center text-gray-400">
              <p className="text-lg font-medium mb-1">今日沒有任務</p>
              <p className="text-sm">如有疑問請聯繫車行管理員</p>
            </div>
          )}

          {tasks.map((b, i) => {
            const passenger = b.passenger
            const vehicle = b.vehicle
            const cu = b.care_unit
            const isCompleted = b.status === '已完成'
            const isActive = b.status === '進行中'
            const isExpanded = expandedId === b.id

            return (
              <div
                key={b.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow ${
                  isActive ? 'border-green-300 shadow-green-100' :
                  isCompleted ? 'border-gray-100 opacity-75' :
                  'border-gray-100'
                }`}
              >
                {/* ── Card header (always visible, click to expand) ── */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-2 transition-colors ${
                    isActive ? 'bg-green-50 hover:bg-green-100' :
                    isCompleted ? 'bg-gray-50 hover:bg-gray-100' :
                    'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted ? 'bg-gray-300 text-gray-600' :
                    isActive ? 'bg-green-500 text-white' :
                    'bg-yellow-400 text-white'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{b.service_time}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.direction === '去程' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {b.direction}
                  </span>
                  <span className="font-semibold text-gray-800 ml-1">{passenger?.name ?? '—'}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <Badge value={b.status} />
                    {isExpanded
                      ? <ChevronUp size={15} className="text-gray-400" />
                      : <ChevronDown size={15} className="text-gray-400" />}
                  </span>
                </button>

                {/* ── Collapsed summary: addresses only ── */}
                {!isExpanded && (
                  <div className="px-4 pb-3 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={11} className="text-green-500 shrink-0" />
                      <span className="truncate">{b.pickup_address || '（未填）'}</span>
                      <ArrowRight size={10} className="text-gray-300 shrink-0" />
                      <MapPin size={11} className="text-red-400 shrink-0" />
                      <span className="truncate">{b.dropoff_address || '（未填）'}</span>
                    </div>
                  </div>
                )}

                {/* ── Expanded detail ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100">

                    {/* Route */}
                    <div className="px-4 py-4 space-y-2">
                      <div className="relative pl-5">
                        <div className="absolute left-[7px] top-2.5 bottom-2.5 w-px bg-gray-200" />
                        <div className="relative flex items-start gap-2 pb-3">
                          <span className="absolute -left-5 mt-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">上車地點</p>
                            <p className="text-sm font-medium text-gray-800">{b.pickup_address || '（未填）'}</p>
                          </div>
                        </div>
                        <div className="relative flex items-start gap-2">
                          <span className="absolute -left-5 mt-0.5 w-3.5 h-3.5 rounded-full bg-red-400 border-2 border-white shadow shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">下車地點</p>
                            <p className="text-sm font-medium text-gray-800">{b.dropoff_address || '（未填）'}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          const origin = encodeURIComponent(b.pickup_address ?? '')
                          const dest = encodeURIComponent(b.dropoff_address ?? '')
                          window.open(`https://maps.google.com/?saddr=${origin}&daddr=${dest}`, '_blank')
                        }}
                        className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Navigation size={12} />開啟導航路線
                      </button>
                    </div>

                    {/* Detail rows */}
                    <div className="px-4 pb-4 grid grid-cols-2 gap-3">

                      {/* Passenger */}
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 col-span-2">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><User size={11} />乘客資訊</div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {passenger?.name ?? '—'}
                              {b.wheelchair && <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">♿</span>}
                            </p>
                            {passenger?.disability_level && (
                              <p className="text-xs text-gray-400 mt-0.5">殘障等級：{passenger.disability_level}</p>
                            )}
                          </div>
                          {passenger?.phone && (
                            <a
                              href={`tel:${passenger.phone}`}
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
                            >
                              <Phone size={12} />{passenger.phone}
                            </a>
                          )}
                        </div>
                        {passenger?.emergency_contact && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                            <span>緊急聯絡：{passenger.emergency_contact}</span>
                            {passenger.emergency_phone && (
                              <a
                                href={`tel:${passenger.emergency_phone}`}
                                onClick={e => e.stopPropagation()}
                                className="text-orange-600 hover:text-orange-800"
                              >
                                {passenger.emergency_phone}
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Care unit */}
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Building2 size={11} />長照機構</div>
                        <p className="text-sm font-medium text-gray-800">{cu?.name ?? '—'}</p>
                        {cu?.phone && <p className="text-xs text-gray-400 mt-0.5">{cu.phone}</p>}
                      </div>

                      {/* Vehicle */}
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Car size={11} />使用車輛</div>
                        <p className="text-sm font-medium text-gray-800">{vehicle?.plate_number ?? '未指派'}</p>
                        {vehicle && <p className="text-xs text-gray-400 mt-0.5">{vehicle.brand} {vehicle.model}</p>}
                      </div>

                      {/* Service time */}
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Clock size={11} />服務時間</div>
                        <p className="text-sm font-medium text-gray-800">{b.service_date}</p>
                        <p className="text-xs text-gray-400">{b.service_time ?? '未設定'}</p>
                      </div>

                      {/* Booking ID */}
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Hash size={11} />訂單編號</div>
                        <p className="text-xs font-mono text-gray-600 break-all">{b.id.slice(-12)}</p>
                      </div>

                      {/* Notes */}
                      {b.notes && (
                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2.5 col-span-2">
                          <div className="flex items-center gap-1.5 text-xs text-yellow-600 mb-1"><FileText size={11} />備註</div>
                          <p className="text-sm text-gray-700">{b.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isCompleted && (
                      <div className="px-4 pb-4 flex gap-2">
                        <button
                          onClick={e => handleAction(e, b.id, b.status)}
                          disabled={actionLoading === b.id}
                          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${isActive ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                          {actionLoading === b.id
                            ? <RefreshCw size={14} className="animate-spin" />
                            : isActive ? <CheckCircle2 size={14} /> : <Navigation size={14} />}
                          {isActive ? '完成任務' : '開始接送'}
                        </button>
                      </div>
                    )}
                    {isCompleted && (
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-lg text-gray-400 text-sm font-medium">
                          <CheckCircle2 size={15} />任務已完成
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
