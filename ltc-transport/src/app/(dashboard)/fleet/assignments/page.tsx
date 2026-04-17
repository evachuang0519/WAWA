'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import { DRIVERS, VEHICLES, PASSENGERS, CARE_UNITS } from '@/lib/db'
import {
  UserCheck, Car, Clock, CheckCircle2, AlertCircle, RefreshCw,
  MapPin, ArrowRight, X, ChevronRight, Phone, Hash,
} from 'lucide-react'
import type { BookingRecord, TaskAssignment } from '@/types'

interface AssignmentMap { [bookingId: string]: TaskAssignment }

export default function AssignmentsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentMap>({})
  const [selections, setSelections] = useState<Record<string, { driver_id: string; vehicle_id: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<BookingRecord | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bRes, aRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/assignments'),
      ])
      const bData = await bRes.json()
      const aData = await aRes.json()
      const bList: BookingRecord[] = bData.data ?? []
      const aList: TaskAssignment[] = aData.data ?? []
      setBookings(bList)
      const map: AssignmentMap = {}
      aList.forEach(a => { map[a.booking_id] = a })
      setAssignments(map)
      const sel: Record<string, { driver_id: string; vehicle_id: string }> = {}
      aList.forEach(a => { sel[a.booking_id] = { driver_id: a.driver_id, vehicle_id: a.vehicle_id } })
      setSelections(prev => ({ ...sel, ...prev }))
    } catch {
      showToast('載入失敗', false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setSelection = (bookingId: string, field: 'driver_id' | 'vehicle_id', value: string) => {
    setSelections(prev => ({ ...prev, [bookingId]: { ...prev[bookingId], [field]: value } }))
  }

  const handleAssign = async (bookingId: string) => {
    const sel = selections[bookingId]
    if (!sel?.driver_id || !sel?.vehicle_id) { showToast('請選擇駕駛與車輛', false); return }
    setSaving(bookingId)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, ...sel }),
      })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error ?? '指派失敗', false)
      } else {
        if (json.data?.warning) {
          showToast(`⚠️ 指派成功，但${json.data.warning}`, false)
        } else {
          showToast('指派成功', true)
        }
        await load()
      }
    } catch {
      showToast('網路錯誤', false)
    }
    setSaving(null)
  }

  const unassigned = bookings.filter(b => b.status === '待指派')
  const assigned = bookings.filter(b => b.status === '已指派' || b.status === '進行中')

  // ── Detail panel helpers ────────────────────────────────────
  const detailPassenger = detail ? PASSENGERS.find(p => p.id === detail.passenger_id) : null
  const detailCU = detail ? CARE_UNITS.find(c => c.id === detail.care_unit_id) : null
  const detailTask = detail ? assignments[detail.id] : null
  const detailDriver = detailTask ? DRIVERS.find(d => d.id === detailTask.driver_id) : null
  const detailVehicle = detailTask ? VEHICLES.find(v => v.id === detailTask.vehicle_id) : null

  return (
    <div className="flex h-full">
      {/* ── Main content ─────────────────────────────────────── */}
      <div className={`flex-1 min-w-0 transition-all ${detail ? 'mr-[380px]' : ''}`}>
        <TopBar title="任務指派" subtitle="將訂車紀錄指派給駕駛與車輛" />

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </div>
        )}

        <div className="p-6 space-y-6">

          {/* ── Unassigned ─────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <h3 className="font-semibold text-gray-800">待指派訂車</h3>
              <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">{unassigned.length} 筆</span>
              <button onClick={load} className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {loading && <div className="px-6 py-8 text-center text-gray-400 text-sm">載入中…</div>}
              {!loading && unassigned.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">目前沒有待指派的訂車</div>
              )}
              {unassigned.map(b => {
                const passenger = PASSENGERS.find(p => p.id === b.passenger_id)
                const cu = CARE_UNITS.find(c => c.id === b.care_unit_id)
                const sel = selections[b.id] ?? {}
                const isSaving = saving === b.id
                const isSelected = detail?.id === b.id
                return (
                  <div
                    key={b.id}
                    className={`px-6 py-4 transition-colors ${isSelected ? 'bg-yellow-50 border-l-2 border-yellow-400' : 'hover:bg-yellow-50/60 border-l-2 border-transparent'}`}
                  >
                    {/* Top row: info + click target */}
                    <button
                      type="button"
                      onClick={() => setDetail(isSelected ? null : b)}
                      className="w-full text-left mb-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800">{passenger?.name ?? b.passenger_id.slice(0, 8)}</span>
                            <span className="text-xs text-gray-400">{cu?.short_name}</span>
                            {b.wheelchair && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">♿</span>}
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${b.direction === '去程' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{b.direction}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                            <Clock size={11} />{b.service_date} {b.service_time}
                          </div>
                          {/* Addresses */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={11} className="text-green-500 shrink-0" />
                            <span className="truncate max-w-[160px]">{b.pickup_address || '（未填）'}</span>
                            <ArrowRight size={10} className="shrink-0 text-gray-300" />
                            <MapPin size={11} className="text-red-400 shrink-0" />
                            <span className="truncate max-w-[160px]">{b.dropoff_address || '（未填）'}</span>
                          </div>
                        </div>
                        <ChevronRight size={14} className={`shrink-0 mt-1 text-gray-300 transition-transform ${isSelected ? 'rotate-90 text-yellow-500' : ''}`} />
                      </div>
                    </button>

                    {/* Controls row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={sel.driver_id ?? ''}
                        onChange={e => setSelection(b.id, 'driver_id', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                      >
                        <option value="">選擇駕駛</option>
                        {DRIVERS.filter(d => d.status === 'active').map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <select
                        value={sel.vehicle_id ?? ''}
                        onChange={e => setSelection(b.id, 'vehicle_id', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                      >
                        <option value="">選擇車輛</option>
                        {VEHICLES.filter(v => {
                          if (b.wheelchair) return v.wheelchair_slots > 0 && v.status === 'available'
                          return v.status === 'available'
                        }).map(v => (
                          <option key={v.id} value={v.id}>{v.plate_number}</option>
                        ))}
                      </select>
                      <button
                        disabled={isSaving}
                        onClick={() => handleAssign(b.id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {isSaving ? <RefreshCw size={12} className="animate-spin" /> : null}
                        指派
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Assigned ───────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              <h3 className="font-semibold text-gray-800">已指派任務</h3>
              <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">{assigned.length} 筆</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['日期/時間', '乘客', '起訖地點', '駕駛', '車輛', '方向', '狀態', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assigned.length === 0 && !loading && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">尚無已指派任務</td></tr>
                  )}
                  {assigned.map(b => {
                    const task = assignments[b.id]
                    const passenger = PASSENGERS.find(p => p.id === b.passenger_id)
                    const driver = DRIVERS.find(d => d.id === task?.driver_id)
                    const vehicle = VEHICLES.find(v => v.id === task?.vehicle_id)
                    const sel = selections[b.id] ?? {}
                    const isSaving = saving === b.id
                    const isSelected = detail?.id === b.id
                    return (
                      <tr
                        key={b.id}
                        onClick={() => setDetail(isSelected ? null : b)}
                        className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-2 border-blue-400' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 whitespace-nowrap">{b.service_date}</p>
                          <p className="text-xs text-gray-400">{b.service_time}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{passenger?.name ?? b.passenger_id.slice(0, 8)}</td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                            <MapPin size={10} className="text-green-500 shrink-0" />
                            <span className="truncate">{b.pickup_address || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={10} className="text-red-400 shrink-0" />
                            <span className="truncate">{b.dropoff_address || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-gray-700">
                            <UserCheck size={14} className="text-green-600" />
                            {driver?.name || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-gray-700">
                            <Car size={14} className="text-blue-600" />
                            {vehicle?.plate_number || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${b.direction === '去程' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {b.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3"><Badge value={b.status} /></td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {b.status === '已指派' && (
                            <div className="flex items-center gap-1">
                              <select
                                value={sel.driver_id ?? task?.driver_id ?? ''}
                                onChange={e => setSelection(b.id, 'driver_id', e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                              >
                                {DRIVERS.filter(d => d.status === 'active').map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                              <button
                                disabled={isSaving}
                                onClick={() => handleAssign(b.id)}
                                className="px-2 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                              >
                                {isSaving ? <RefreshCw size={12} className="animate-spin" /> : '改派'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── Detail drawer ─────────────────────────────────────── */}
      <div className={`fixed top-0 right-0 h-full w-[380px] bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col transition-transform duration-300 ${detail ? 'translate-x-0' : 'translate-x-full'}`}>
        {detail && (
          <>
            {/* Drawer header */}
            <div className={`px-5 py-4 border-b border-gray-100 flex items-center gap-3 ${detail.direction === '去程' ? 'bg-green-600' : 'bg-blue-600'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70 font-medium uppercase tracking-wide">訂單詳情</p>
                <p className="text-white font-bold truncate">{detailPassenger?.name ?? detail.passenger_id.slice(0, 8)}</p>
              </div>
              <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full">{detail.direction}</span>
              <button onClick={() => setDetail(null)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Date / time */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                <Clock size={16} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{detail.service_date}</p>
                  <p className="text-xs text-gray-400">{detail.service_time ?? '時間未設定'}</p>
                </div>
                <Badge value={detail.status} />
              </div>

              {/* Route */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">起訖地點</p>
                <div className="relative pl-5">
                  {/* vertical line */}
                  <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />
                  {/* pickup */}
                  <div className="relative flex items-start gap-3 pb-4">
                    <span className="absolute -left-5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">上車地點</p>
                      <p className="text-sm font-medium text-gray-800">{detail.pickup_address || '（未填）'}</p>
                    </div>
                  </div>
                  {/* dropoff */}
                  <div className="relative flex items-start gap-3">
                    <span className="absolute -left-5 w-3.5 h-3.5 rounded-full bg-red-400 border-2 border-white shadow mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">下車地點</p>
                      <p className="text-sm font-medium text-gray-800">{detail.dropoff_address || '（未填）'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passenger */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">服務個案</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{detailPassenger?.name ?? '—'}</span>
                    <span className="text-xs text-gray-400">{detailCU?.name ?? '—'}</span>
                  </div>
                  {detailPassenger?.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Phone size={11} />{detailPassenger.phone}
                    </div>
                  )}
                  {detail.wheelchair && (
                    <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">♿ 需要輪椅無障礙車輛</span>
                  )}
                  {detailPassenger?.disability_level && (
                    <p className="text-xs text-gray-500">殘障等級：{detailPassenger.disability_level}</p>
                  )}
                </div>
              </div>

              {/* Assignment */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">指派資訊</p>
                {detailTask ? (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <UserCheck size={14} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">駕駛</p>
                        <p className="text-sm font-semibold text-gray-800">{detailDriver?.name ?? detailTask.driver_id.slice(0, 8)}</p>
                        {detailDriver?.phone && (
                          <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{detailDriver.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Car size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">車輛</p>
                        <p className="text-sm font-semibold text-gray-800">{detailVehicle?.plate_number ?? detailTask.vehicle_id.slice(0, 8)}</p>
                        {detailVehicle && (
                          <p className="text-xs text-gray-400">{detailVehicle.brand} {detailVehicle.model} · 座位 {detailVehicle.capacity}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700 font-medium">
                    尚未指派駕駛與車輛
                  </div>
                )}
              </div>

              {/* Notes */}
              {detail.notes && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">備註</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">{detail.notes}</p>
                </div>
              )}

              {/* Meta */}
              <div className="space-y-1 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Hash size={10} />訂單 ID</span>
                  <span className="font-mono">{detail.id.slice(-12)}</span>
                </div>
                {detail.batch_id && (
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>批次</span>
                    <span className="font-mono">{detail.batch_id.slice(-8)}</span>
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>

      {/* Backdrop (mobile) */}
      {detail && (
        <div className="fixed inset-0 bg-black/10 z-30 lg:hidden" onClick={() => setDetail(null)} />
      )}
    </div>
  )
}
