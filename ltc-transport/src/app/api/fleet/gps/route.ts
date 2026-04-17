/**
 * GPS 位置上報 API
 * POST /api/fleet/gps  —— 駕駛端推送目前座標
 * GET  /api/fleet/gps  —— 取得所有駕駛最新座標（快照）
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole, apiSuccess, API_ERRORS } from '@/lib/api-helpers'

export interface GpsPoint {
  driver_id:   string
  driver_name: string
  vehicle_id?: string
  lat:         number
  lng:         number
  heading?:    number
  speed?:      number
  updated_at:  string
}

// 記憶體存放最新座標（重啟後清空，可改存 Redis）
declare global {
  // eslint-disable-next-line no-var
  var __gpsStore: Map<string, GpsPoint> | undefined
  // eslint-disable-next-line no-var
  var __sseSubs: Set<(point: GpsPoint) => void> | undefined
}
if (!global.__gpsStore) global.__gpsStore = new Map()
if (!global.__sseSubs) global.__sseSubs = new Set()

const store = global.__gpsStore
const subs  = global.__sseSubs

// ── POST: 駕駛上報 ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { lat, lng, heading, speed, vehicle_id } = await req.json()
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return API_ERRORS.BAD_REQUEST('lat / lng 必須為數字')
  }

  // 取得 driver_id（從 /api/driver/me，或直接信任 session.id 對應 driver）
  const driverId = req.headers.get('x-driver-id') ?? session.id

  const point: GpsPoint = {
    driver_id:   driverId,
    driver_name: session.name,
    vehicle_id,
    lat,
    lng,
    heading,
    speed,
    updated_at: new Date().toISOString(),
  }
  store.set(driverId, point)

  // 通知所有 SSE 訂閱者
  subs.forEach(cb => cb(point))

  return apiSuccess({ ok: true })
}

// ── GET: 快照 ─────────────────────────────────────────────────
export async function GET() {
  const { error } = await requireRole('fleet_admin', 'system_admin', 'org_admin')
  if (error) return error
  return apiSuccess(Array.from(store.values()))
}
