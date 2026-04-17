'use client'
import { useEffect, useRef, useState } from 'react'

export type MapMarker = {
  id: string
  lat: number
  lng: number
  label: string
  type: 'vehicle' | 'pickup' | 'dropoff' | 'center'
  color?: string
  info?: string
}

export type MapRoute = {
  id: string
  points: [number, number][]
  color: string
  label?: string
}

type Props = {
  markers: MapMarker[]
  routes?: MapRoute[]
  center?: [number, number]
  zoom?: number
  height?: string
}

export default function VehicleMap({ markers, routes = [], center = [24.148, 120.674], zoom = 13, height = '100%' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const init = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      // Fix default icon broken paths in Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, { zoomControl: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      map.setView(center, zoom)

      mapRef.current = { map, L, layers: [] as unknown[] }
      setReady(true)
    }
    init()

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapRef.current as any).map.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers & routes when data changes
  useEffect(() => {
    if (!ready || !mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { map, L, layers } = mapRef.current as any

    // Clear previous layers
    layers.forEach((l: unknown) => map.removeLayer(l))
    layers.length = 0

    const COLORS: Record<string, string> = {
      vehicle: '#16a34a',
      pickup:  '#2563eb',
      dropoff: '#9333ea',
      center:  '#dc2626',
    }
    const ICONS: Record<string, string> = {
      vehicle: '🚐',
      pickup:  '🏠',
      dropoff: '🏥',
      center:  '🏢',
    }

    // Draw routes first (below markers)
    routes.forEach(route => {
      if (route.points.length < 2) return
      const line = L.polyline(route.points, {
        color: route.color,
        weight: 3,
        opacity: 0.7,
        dashArray: '6 4',
      }).addTo(map)
      if (route.label) line.bindTooltip(route.label)
      layers.push(line)
    })

    // Draw markers
    markers.forEach(m => {
      const color = COLORS[m.type] || '#6b7280'
      const emoji = ICONS[m.type] || '📍'
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:${color};color:white;
          border-radius:50%;width:32px;height:32px;
          display:flex;align-items:center;justify-content:center;
          font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3);
          border:2px solid white;
        ">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const marker = L.marker([m.lat, m.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${m.label}</b>${m.info ? '<br>' + m.info : ''}`)
      layers.push(marker)
    })
  }, [ready, markers, routes])

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10 rounded-xl">
          <div className="text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            載入地圖中…
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }} />
    </div>
  )
}
