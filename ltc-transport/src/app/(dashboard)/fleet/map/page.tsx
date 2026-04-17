'use client'
import TopBar from '@/components/layout/TopBar'
import dynamic from 'next/dynamic'
import { useState, useEffect, useRef, useCallback } from 'react'
import { VEHICLES, DRIVERS, PASSENGERS, BOOKING_RECORDS, TASK_ASSIGNMENTS, CARE_UNITS, TRANSPORT_COMPANIES } from '@/lib/db'
import type { MapMarker, MapRoute } from '@/components/map/VehicleMap'
import { Radio, Navigation, MapPin, Wifi, WifiOff } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { GpsPoint } from '@/app/api/fleet/gps/route'

const VehicleMap = dynamic(() => import('@/components/map/VehicleMap'), { ssr: false })

// 模擬座標（無 GPS 上報時 fallback）
const MOCK_POS: Record<string, [number, number]> = {
  [VEHICLES[0]?.id ?? '']: [24.1392, 120.6768],
  [VEHICLES[1]?.id ?? '']: [24.1460, 120.6810],
  [VEHICLES[2]?.id ?? '']: [24.1505, 120.6845],
  [VEHICLES[3]?.id ?? '']: [24.1430, 120.6790],
}

const GEO: Record<string, [number, number]> = {
  [CARE_UNITS[0]?.id ?? '']: [24.1408, 120.6792],
  [CARE_UNITS[1]?.id ?? '']: [24.1521, 120.6831],
  [PASSENGERS[0]?.id ?? '']: [24.1380, 120.6745],
  [PASSENGERS[1]?.id ?? '']: [24.1365, 120.6712],
  [PASSENGERS[2]?.id ?? '']: [24.1445, 120.6889],
  [PASSENGERS[3]?.id ?? '']: [24.1521, 120.6831],
  [PASSENGERS[4]?.id ?? '']: [24.1556, 120.6758],
}

function jitter(pos: [number, number]): [number, number] {
  return [pos[0] + (Math.random() - 0.5) * 0.002, pos[1] + (Math.random() - 0.5) * 0.002]
}

export default function FleetMapPage() {
  const today = new Date().toISOString().split('T')[0]
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [vehiclePos, setVehiclePos] = useState<Record<string, [number, number]>>({ ...MOCK_POS })
  const [gpsPoints, setGpsPoints] = useState<Map<string, GpsPoint>>(new Map())
  const [sseConnected, setSseConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  // ── SSE 連線 ─────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource('/api/fleet/gps/stream')
    esRef.current = es

    es.onopen = () => setSseConnected(true)
    es.onerror = () => setSseConnected(false)

    es.onmessage = e => {
      try {
        const msg = JSON.parse(e.data) as
          | { type: 'snapshot'; points: GpsPoint[] }
          | { type: 'update'; point: GpsPoint }

        if (msg.type === 'snapshot') {
          const map = new Map<string, GpsPoint>()
          msg.points.forEach(p => map.set(p.driver_id, p))
          setGpsPoints(map)
          // 更新 vehiclePos（用 vehicle_id 對應）
          setVehiclePos(prev => {
            const next = { ...prev }
            msg.points.forEach(p => {
              if (p.vehicle_id) next[p.vehicle_id] = [p.lat, p.lng]
            })
            return next
          })
        } else {
          setGpsPoints(prev => new Map(prev).set(msg.point.driver_id, msg.point))
          if (msg.point.vehicle_id) {
            setVehiclePos(prev => ({
              ...prev,
              [msg.point.vehicle_id!]: [msg.point.lat, msg.point.lng],
            }))
          }
        }
      } catch { /* ignore parse errors */ }
    }

    return () => { es.close(); setSseConnected(false) }
  }, [])

  // ── Mock 模擬位移（沒有 GPS 上報的車輛） ─────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setVehiclePos(prev => {
        const next = { ...prev }
        VEHICLES.filter(v => v.status !== 'retired').forEach(v => {
          // 只模擬沒有 GPS 上報的車輛
          const hasRealGps = Array.from(gpsPoints.values()).some(p => p.vehicle_id === v.id)
          if (!hasRealGps) {
            next[v.id] = jitter(prev[v.id] ?? MOCK_POS[v.id])
          }
        })
        return next
      })
    }, 4000)
    return () => clearInterval(id)
  }, [gpsPoints])

  const todayBookings = BOOKING_RECORDS.filter(b => b.service_date === today)

  const shownTaskIds = selectedVehicle
    ? TASK_ASSIGNMENTS.filter(t => t.vehicle_id === selectedVehicle).map(t => t.booking_id)
    : TASK_ASSIGNMENTS.map(t => t.booking_id)

  // ── 地圖 markers & routes ─────────────────────────────────────
  const markers: MapMarker[] = []
  const routes: MapRoute[] = []
  const ROUTE_COLORS = ['#16a34a', '#2563eb', '#9333ea', '#d97706', '#dc2626', '#0891b2']

  CARE_UNITS.forEach(cu => {
    const pos = GEO[cu.id]
    if (pos) markers.push({ id: cu.id, lat: pos[0], lng: pos[1], label: cu.name, type: 'center', info: cu.phone })
  })

  const relevantVehicles = selectedVehicle
    ? VEHICLES.filter(v => v.id === selectedVehicle)
    : VEHICLES.filter(v => v.status !== 'retired')

  relevantVehicles.forEach(v => {
    const pos = vehiclePos[v.id]
    if (!pos) return
    const tasks = TASK_ASSIGNMENTS.filter(t => t.vehicle_id === v.id)
    const driver = DRIVERS.find(d => tasks.some(t => t.driver_id === d.id))
    const hasGps = Array.from(gpsPoints.values()).some(p => p.vehicle_id === v.id)
    markers.push({
      id: v.id, lat: pos[0], lng: pos[1],
      label: v.plate_number, type: 'vehicle',
      info: `${driver?.name ?? '未指派'} · ${v.brand} ${v.model}${hasGps ? ' 🔴 即時' : ''}`,
    })
  })

  const shownBookings = todayBookings.filter(b => shownTaskIds.includes(b.id))
  shownBookings.forEach((b, i) => {
    const p = PASSENGERS.find(ps => ps.id === b.passenger_id)
    if (!p) return
    const pPos = GEO[p.id]
    const cuPos = GEO[b.care_unit_id]
    if (pPos) markers.push({ id: `pick-${b.id}`, lat: pPos[0], lng: pPos[1], label: `上車：${p.name}`, type: 'pickup', info: b.service_time })
    if (cuPos && pPos) {
      const task = TASK_ASSIGNMENTS.find(t => t.booking_id === b.id)
      const vPos = task?.vehicle_id ? vehiclePos[task.vehicle_id] : null
      const routePoints: [number, number][] = vPos ? [vPos, pPos, cuPos] : [pPos, cuPos]
      routes.push({
        id: `route-${b.id}`, points: routePoints,
        color: ROUTE_COLORS[i % ROUTE_COLORS.length],
        label: `${p.name} ${b.direction}`,
      })
    }
  })

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <TopBar title="車輛即時地圖" subtitle="查看今日車輛位置與服務路線" />
      <div className="flex flex-1 overflow-hidden gap-0">

        {/* Left panel */}
        <div className="w-72 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                {sseConnected
                  ? <><Wifi size={12} className="text-green-500" /><span className="text-green-600">即時追蹤連線中</span></>
                  : <><WifiOff size={12} className="text-gray-400" /><span className="text-gray-400">模擬模式（每4秒）</span></>
                }
              </div>
              <span className="text-xs text-gray-400">{gpsPoints.size} 位在線</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <button
              onClick={() => setSelectedVehicle(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedVehicle ? 'bg-green-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
            >
              顯示全部車輛
            </button>
            {VEHICLES.map(v => {
              const company = TRANSPORT_COMPANIES.find(c => c.id === v.company_id)
              const tasks = TASK_ASSIGNMENTS.filter(t => t.vehicle_id === v.id)
              const driver = DRIVERS.find(d => tasks.some(t => t.driver_id === d.id))
              const todayTrips = tasks.filter(t => shownTaskIds.includes(t.booking_id)).length
              const isSelected = selectedVehicle === v.id
              const gpsPoint = Array.from(gpsPoints.values()).find(p => p.vehicle_id === v.id)
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicle(isSelected ? null : v.id)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${isSelected ? 'border-green-400 bg-green-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-gray-900">{v.plate_number}</span>
                    <Badge value={v.status} />
                  </div>
                  <p className="text-xs text-gray-500">{company?.short_name} · {v.brand} {v.model}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Navigation size={10} />{driver?.name ?? '未指派'}
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <MapPin size={10} />今日 {todayTrips} 趟
                    </span>
                  </div>
                  {gpsPoint
                    ? (
                      <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                        即時 GPS · {new Date(gpsPoint.updated_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Radio size={9} />模擬位置
                      </div>
                    )
                  }
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="p-3 border-t border-gray-100 space-y-1">
            <p className="text-xs font-semibold text-gray-500 mb-2">圖例</p>
            {[
              { emoji: '🚐', label: '車輛位置' },
              { emoji: '🏠', label: '乘客上車點' },
              { emoji: '🏢', label: '日照中心' },
              { emoji: '━ ━', label: '行駛路線' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-5 text-center">{item.emoji}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 p-3">
          <VehicleMap
            markers={markers}
            routes={routes}
            center={[24.148, 120.680]}
            zoom={14}
            height="100%"
          />
        </div>
      </div>
    </div>
  )
}
