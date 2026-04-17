'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import {
  MapPin, Clock, Search, RefreshCw, ChevronDown, ChevronUp,
  Car, User, Building2, Hash, FileText, ArrowRight, Navigation,
  Phone, Calendar, CheckCircle2, AlertCircle,
} from 'lucide-react'
import type { Driver } from '@/types'
import type { EnrichedBooking } from '@/lib/queries/bookings'

type BookingWithVehicle = EnrichedBooking

function getMonthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const start = `${y}-${m}-01`
  const today = now.toISOString().split('T')[0]
  return { start, end: today }
}

export default function DriverHistoryPage() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [tasks, setTasks] = useState<BookingWithVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const defaultRange = getMonthRange()
  const [startDate, setStartDate] = useState(defaultRange.start)
  const [endDate, setEndDate] = useState(defaultRange.end)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async (driverId: string, start: string, end: string) => {
    try {
      const res = await fetch(`/api/bookings?driver_id=${driverId}&start_date=${start}&end_date=${end}`)
      const json = await res.json()
      const all: BookingWithVehicle[] = json.data ?? []
      return all.sort((a, b) => {
        const dateCompare = b.service_date.localeCompare(a.service_date)
        if (dateCompare !== 0) return dateCompare
        return (a.service_time ?? '').localeCompare(b.service_time ?? '')
      })
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    fetch('/api/driver/me')
      .then(r => r.json())
      .then(async d => {
        if (d.data) {
          setDriver(d.data)
          const list = await fetchTasks(d.data.id, startDate, endDate)
          setTasks(list)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch() {
    if (!driver) return
    if (startDate > endDate) {
      setError('開始日期不可晚於結束日期')
      return
    }
    setError(null)
    setSearching(true)
    setExpandedId(null)
    const list = await fetchTasks(driver.id, startDate, endDate)
    setTasks(list)
    setSearching(false)
  }

  // Group tasks by date
  const grouped: Record<string, BookingWithVehicle[]> = {}
  for (const t of tasks) {
    if (!grouped[t.service_date]) grouped[t.service_date] = []
    grouped[t.service_date].push(t)
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const completedCount = tasks.filter(t => t.status === '已完成').length

  if (loading) {
    return (
      <div>
        <TopBar title="歷史任務" subtitle="個人任務查詢" />
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" />載入中…
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="歷史任務" subtitle="個人任務查詢" />

      <div className="p-6 space-y-5">

        {/* Search bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">開始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">結束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {searching
                ? <RefreshCw size={14} className="animate-spin" />
                : <Search size={14} />}
              查詢
            </button>
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />{error}
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{tasks.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">總趟次</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">已完成</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{sortedDates.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">服務天數</p>
            </div>
          </div>
        )}

        {/* Task list grouped by date */}
        {tasks.length === 0 && !searching && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-14 text-center text-gray-400">
            <Calendar size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium mb-1">查無任務紀錄</p>
            <p className="text-sm">請調整日期區間後重新查詢</p>
          </div>
        )}

        {sortedDates.map(date => (
          <div key={date} className="space-y-2">
            {/* Date header */}
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-green-500" />
              <span className="text-sm font-semibold text-gray-600">{date}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {grouped[date].length} 趟
              </span>
            </div>

            {/* Cards for this date */}
            {grouped[date].map((b, i) => {
              const passenger = b.passenger
              const vehicle = b.vehicle
              const cu = b.care_unit
              const isCompleted = b.status === '已完成'
              const isExpanded = expandedId === b.id

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                    isCompleted ? 'border-gray-100' : 'border-yellow-200'
                  }`}
                >
                  {/* Card header */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCompleted ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{b.service_time ?? '—'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      b.direction === '去程' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
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

                  {/* Collapsed: address summary */}
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

                  {/* Expanded detail */}
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
                                {b.wheelchair && (
                                  <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">♿</span>
                                )}
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

                        {/* Completed indicator */}
                        {isCompleted && (
                          <div className="col-span-2 flex items-center justify-center gap-2 py-2 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm font-medium">
                            <CheckCircle2 size={15} />任務已完成
                          </div>
                        )}

                        {/* Notes */}
                        {b.notes && (
                          <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2.5 col-span-2">
                            <div className="flex items-center gap-1.5 text-xs text-yellow-600 mb-1"><FileText size={11} />備註</div>
                            <p className="text-sm text-gray-700">{b.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
