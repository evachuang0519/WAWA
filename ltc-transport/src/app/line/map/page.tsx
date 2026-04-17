'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { PASSENGERS, CARE_UNITS } from '@/lib/db'
import type { MapMarker, MapRoute } from '@/components/map/VehicleMap'
import { Navigation2 } from 'lucide-react'
import Link from 'next/link'
import type { BookingRecord, Driver } from '@/types'

const VehicleMap = dynamic(() => import('@/components/map/VehicleMap'), { ssr: false })

const today = new Date().toISOString().split('T')[0]

const GEO: Record<string, [number, number]> = {
  [CARE_UNITS[0].id]: [24.1408, 120.6792],
  [CARE_UNITS[1].id]: [24.1521, 120.6831],
  [PASSENGERS[0].id]: [24.1380, 120.6745],
  [PASSENGERS[1].id]: [24.1365, 120.6712],
  [PASSENGERS[2].id]: [24.1445, 120.6889],
  [PASSENGERS[3].id]: [24.1521, 120.6831],
  [PASSENGERS[4].id]: [24.1556, 120.6758],
}

export default function LineMapPage() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [myBookings, setMyBookings] = useState<BookingRecord[]>([])
  const [myPos, setMyPos] = useState<[number, number] | null>(null)

  useEffect(() => {
    fetch('/api/driver/me')
      .then(r => r.json())
      .then(d => {
        if (!d.data) return
        setDriver(d.data)
        return fetch(`/api/bookings?driver_id=${d.data.id}&start_date=${today}&end_date=${today}`)
          .then(r => r.json())
          .then(json => setMyBookings(json.data ?? []))
      })
      .catch(() => {})

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        pos => setMyPos([pos.coords.latitude, pos.coords.longitude]),
        () => setMyPos([24.148, 120.674]) // Taichung fallback
      )
    } else {
      setMyPos([24.148, 120.674])
    }
  }, [])

  const markers: MapMarker[] = []
  const routes: MapRoute[] = []

  if (myPos) {
    markers.push({ id: 'me', lat: myPos[0], lng: myPos[1], label: driver?.name ?? '我的位置', type: 'vehicle', info: '即時位置' })
  }

  myBookings.forEach((b, i) => {
    const p = PASSENGERS.find(ps => ps.id === b.passenger_id)
    if (!p) return
    const pPos = GEO[p.id]
    const cuPos = GEO[b.care_unit_id]
    if (pPos) {
      markers.push({ id: `p-${b.id}`, lat: pPos[0], lng: pPos[1], label: p.name, type: 'pickup', info: b.service_time })
      if (cuPos && myPos) {
        routes.push({
          id: `r-${b.id}`,
          points: [myPos, pPos, cuPos],
          color: ['#16a34a','#2563eb','#9333ea','#d97706'][i % 4],
          label: `${p.name} ${b.direction}`,
        })
      }
    }
  })

  CARE_UNITS.forEach(cu => {
    const pos = GEO[cu.id]
    if (pos) markers.push({ id: cu.id, lat: pos[0], lng: pos[1], label: cu.name, type: 'center' })
  })

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-green-600 px-4 pt-12 pb-4 text-white flex items-center gap-3">
        <Navigation2 size={20} />
        <div>
          <h1 className="font-bold">今日路線</h1>
          <p className="text-xs text-green-100">{myBookings.length} 個接送點</p>
        </div>
      </div>

      <div className="flex-1">
        {myPos ? (
          <VehicleMap markers={markers} routes={routes} center={myPos} zoom={14} height="100%" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              取得位置中…
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-gray-100 flex shadow-lg">
        {[
          { href: '/line/tasks',   icon: '📋', label: '任務' },
          { href: '/line/map',     icon: '🗺️', label: '地圖' },
          { href: '/line/record',  icon: '📝', label: '填寫' },
          { href: '/line/history', icon: '📅', label: '歷史' },
          { href: '/line/me',      icon: '👤', label: '我的' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2.5 text-xs font-medium ${item.href === '/line/map' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
