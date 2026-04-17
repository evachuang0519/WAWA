'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { MapPin, Clock, Ruler, RefreshCw, Search } from 'lucide-react'

interface ServiceRecord {
  id: string; order_number: string; status: string; service_date?: string; service_time?: string
  passenger_id?: string; driver_id?: string; vehicle_id?: string
  pickup_address?: string; dropoff_location?: string
  actual_pickup_time?: string; actual_dropoff_time?: string
  distance_km?: number; duration_minutes?: number; notes?: string
}

export default function RecordsPage() {
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/service-records')
      const json = await res.json()
      setRecords(json.data ?? [])
    } catch { setRecords([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const shown = search
    ? records.filter(r => r.order_number?.includes(search) || r.pickup_address?.includes(search))
    : records

  const totalKm = shown.reduce((s, r) => s + (r.distance_km ?? 0), 0)

  return (
    <div>
      <TopBar title="服務紀錄" subtitle="查閱所有完成的服務明細" />
      <div className="p-6 space-y-4">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '總筆數', value: shown.length, sub: '筆', color: 'text-green-600' },
            { label: '總里程', value: totalKm.toFixed(1), sub: '公里', color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value} <span className="text-sm font-normal text-gray-400">{s.sub}</span></p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋單號或地址…"
              className="flex-1 text-sm focus:outline-none" />
          </div>
          <button onClick={load} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">服務明細列表</h3>
            <span className="text-sm text-gray-500">共 {shown.length} 筆</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw size={20} className="animate-spin mr-2" />載入中…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['單號', '服務日期', '接送時間', '里程', '地址', '狀態'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{r.order_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{r.service_date}</p>
                        <p className="text-xs text-gray-400">{r.service_time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock size={11} />{r.actual_pickup_time || r.service_time || '—'}
                          <span className="text-gray-300 mx-0.5">→</span>
                          {r.actual_dropoff_time || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600"><Ruler size={11} />{r.distance_km ?? '—'} km</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={11} /><span className="truncate max-w-40">{r.pickup_address || '—'}</span></div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">{r.status}</span>
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">目前沒有服務紀錄</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
