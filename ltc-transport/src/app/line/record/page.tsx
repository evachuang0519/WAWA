'use client'
import { useState, useEffect } from 'react'
import { PASSENGERS } from '@/lib/db'
import { Clock, Ruler, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { BookingRecord, Driver } from '@/types'

const today = new Date().toISOString().split('T')[0]

type BookingWithVehicle = BookingRecord & { assigned_vehicle_id?: string }

export default function LineRecordPage() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [bookings, setBookings] = useState<BookingWithVehicle[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState({ pickupTime: '', dropoffTime: '', distanceKm: '', note: '' })
  const [done, setDone] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/driver/me')
      .then(r => r.json())
      .then(d => {
        if (!d.data) return
        setDriver(d.data)
        return fetch(`/api/bookings?driver_id=${d.data.id}&start_date=${today}&end_date=${today}&status=已完成`)
          .then(r => r.json())
          .then(json => setBookings(json.data ?? []))
      })
      .catch(() => {})
  }, [])

  const selected = bookings.find(b => b.id === selectedId)
  const passenger = selected ? PASSENGERS.find(p => p.id === selected.passenger_id) : null

  async function handleSubmit() {
    if (!selected || !driver) return
    setSaving(true)
    setSaveError(null)
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
          actual_pickup_time: form.pickupTime || null,
          actual_dropoff_time: form.dropoffTime || null,
          distance_km: form.distanceKm ? Number(form.distanceKm) : null,
          notes: form.note || null,
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      setDone(d => new Set([...d, selected.id]))
      setSelectedId(null)
      setForm({ pickupTime: '', dropoffTime: '', distanceKm: '', note: '' })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '儲存失敗，請稍後再試')
    }
    setSaving(false)
  }

  if (selectedId && selected) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="bg-green-600 px-4 pt-12 pb-4 text-white">
          <button onClick={() => { setSelectedId(null); setSaveError(null) }} className="text-green-100 text-sm mb-2">← 返回</button>
          <h1 className="font-bold text-lg">填寫服務明細</h1>
          <p className="text-green-100 text-sm">{passenger?.name} · {selected.service_time} {selected.direction}</p>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">{saveError}</div>
          )}
          <div className="bg-white rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">實際上車時間</label>
                <div className="flex items-center gap-2 mt-1 border border-gray-200 rounded-xl px-3 py-2.5">
                  <Clock size={14} className="text-gray-400" />
                  <input type="time" value={form.pickupTime} onChange={e => setForm(f => ({ ...f, pickupTime: e.target.value }))}
                    className="flex-1 focus:outline-none" style={{ fontSize: '16px' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">實際下車時間</label>
                <div className="flex items-center gap-2 mt-1 border border-gray-200 rounded-xl px-3 py-2.5">
                  <Clock size={14} className="text-gray-400" />
                  <input type="time" value={form.dropoffTime} onChange={e => setForm(f => ({ ...f, dropoffTime: e.target.value }))}
                    className="flex-1 focus:outline-none" style={{ fontSize: '16px' }} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">行駛里程（公里）</label>
              <div className="flex items-center gap-2 mt-1 border border-gray-200 rounded-xl px-3 py-2.5">
                <Ruler size={14} className="text-gray-400" />
                <input type="number" step="0.1" min="0" placeholder="例：5.3" value={form.distanceKm}
                  onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))}
                  className="flex-1 focus:outline-none" style={{ fontSize: '16px' }} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">備註（選填）</label>
              <textarea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="乘客狀況、特殊情況..."
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none resize-none" style={{ fontSize: '16px' }} />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-200 disabled:opacity-60"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {saving ? '儲存中…' : '確認送出'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-green-600 px-4 pt-12 pb-4 text-white">
        <h1 className="font-bold text-lg">服務明細填寫</h1>
        <p className="text-green-100 text-sm">選擇已完成的任務填寫</p>
      </div>
      <div className="flex-1 p-4 space-y-3 pb-24">
        {bookings.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-gray-300" />
            <p>尚無需填寫的任務</p>
            <p className="text-xs mt-1">完成任務後會出現在這裡</p>
          </div>
        )}
        {bookings.map(b => {
          const p = PASSENGERS.find(ps => ps.id === b.passenger_id)
          const filed = done.has(b.id)
          return (
            <button key={b.id} onClick={() => !filed && setSelectedId(b.id)}
              className={`w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border text-left ${filed ? 'border-green-200 opacity-70' : 'border-transparent active:border-green-300'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${filed ? 'bg-green-100' : 'bg-gray-100'}`}>
                {filed ? <CheckCircle2 size={20} className="text-green-600" /> : <span className="text-lg">📋</span>}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{p?.name}</p>
                <p className="text-xs text-gray-400">{b.service_time} · {b.direction}</p>
              </div>
              {filed
                ? <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">已填寫</span>
                : <ChevronRight size={16} className="text-gray-300" />
              }
            </button>
          )
        })}
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
            className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium ${item.href === '/line/record' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
