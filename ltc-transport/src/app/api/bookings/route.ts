import { NextRequest, NextResponse } from 'next/server'
import { bookingStore } from '@/lib/store'
import { dbListBookings, dbCountBookings, dbCreateBooking } from '@/lib/queries/bookings'
import { dbFindDriverByUserId } from '@/lib/queries/drivers'
import { requireRole, requireAuth, API_ERRORS } from '@/lib/api-helpers'
import { writeLog, AUDIT } from '@/lib/audit'
import { randomUUID } from 'crypto'

const useDB = !!process.env.DATABASE_URL
const DEFAULT_LIMIT = 100

// ── 記憶體模式：enriched 補充 ─────────────────────────────────
async function enrichMemBookings(list: ReturnType<typeof bookingStore.list>) {
  const { PASSENGERS, VEHICLES, CARE_UNITS, TASK_ASSIGNMENTS } = await import('@/lib/db')
  return list.map(b => {
    const passenger = PASSENGERS.find(p => p.id === b.passenger_id)
    const care_unit = CARE_UNITS.find(c => c.id === b.care_unit_id)
    const ta = TASK_ASSIGNMENTS.find(t => t.booking_id === b.id)
    const vehicle = ta ? VEHICLES.find(v => v.id === ta.vehicle_id) : undefined
    return {
      ...b,
      passenger,
      care_unit,
      vehicle,
      assigned_vehicle_id: ta?.vehicle_id,
      assigned_driver_id: ta?.driver_id,
    }
  })
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const p = req.nextUrl.searchParams
  const status    = p.get('status')    ?? undefined
  const startDate = p.get('start_date') ?? undefined
  const endDate   = p.get('end_date')   ?? undefined
  const limit     = Math.min(Number(p.get('limit') ?? DEFAULT_LIMIT), 500)
  const offset    = Number(p.get('offset') ?? 0)

  // ── 依角色決定過濾範圍 ────────────────────────────────────────
  let careUnitId: string | undefined
  let companyId: string | undefined
  let driverId: string | undefined

  if (session.role === 'org_admin') {
    careUnitId = session.org_id   // 只看自己機構的訂單
  } else if (session.role === 'fleet_admin') {
    companyId = session.org_id    // 只看待指派 + 自己車行指派的訂單
  } else if (session.role === 'driver') {
    // 駕駛只看分配給自己的任務
    if (useDB) {
      const driver = await dbFindDriverByUserId(session.id)
      if (!driver) return NextResponse.json({ data: [], total: 0, limit, offset })
      driverId = driver.id
    } else {
      // 記憶體模式：依 user_id 找駕駛
      const { DRIVERS } = await import('@/lib/db')
      const driver = DRIVERS.find(d => d.user_id === session.id)
      if (!driver) return NextResponse.json({ data: [], total: 0, limit, offset })
      driverId = driver.id
    }
  } else if (session.role === 'system_admin') {
    // system_admin 可選擇性過濾
    careUnitId = p.get('care_unit_id') ?? undefined
    companyId  = p.get('company_id')   ?? undefined
  }

  try {
    if (useDB) {
      const [data, total] = await Promise.all([
        dbListBookings(status, startDate, endDate, driverId, limit, offset, careUnitId, companyId),
        dbCountBookings(status, startDate, endDate, driverId, careUnitId, companyId),
      ])
      return NextResponse.json({ data, total, limit, offset })
    }

    // 記憶體模式
    const { TASK_ASSIGNMENTS, VEHICLES } = await import('@/lib/db')
    let list = bookingStore.list().filter(b => {
      if (careUnitId && b.care_unit_id !== careUnitId) return false
      if (status && status !== '全部' && b.status !== status) return false
      if (startDate && b.service_date < startDate) return false
      if (endDate   && b.service_date > endDate)   return false
      return true
    })

    if (driverId) {
      const ids = new Set(TASK_ASSIGNMENTS.filter(t => t.driver_id === driverId).map(t => t.booking_id))
      list = list.filter(b => ids.has(b.id))
    }

    if (companyId) {
      list = list.filter(b => {
        if (b.status === '待指派') return true
        const ta = TASK_ASSIGNMENTS.find(t => t.booking_id === b.id)
        if (!ta) return false
        const v = VEHICLES.find(v => v.id === ta.vehicle_id)
        return v?.company_id === companyId
      })
    }

    const total = list.length
    const page  = list.slice(offset, offset + limit)
    const data  = await enrichMemBookings(page)
    return NextResponse.json({ data, total, limit, offset })
  } catch (e) {
    console.error('[GET /api/bookings]', e)
    const list = bookingStore.list()
    const data = await enrichMemBookings(list)
    return NextResponse.json({ data, total: data.length, limit, offset })
  }
}

export async function POST(req: NextRequest) {
  // 只有機構管理員與系統管理員可建立訂單
  const { session, error } = await requireRole('org_admin', 'system_admin')
  if (error) return error

  try {
    const body = await req.json()
    const { round_trip, return_time, return_date, ...base } = body

    // org_admin 強制使用自己的機構 ID，不接受客戶端傳入的 care_unit_id
    if (session.role === 'org_admin') {
      base.care_unit_id = session.org_id
    }

    const batchId = round_trip ? randomUUID() : undefined

    const outboundData = { ...base, direction: '去程' as const, batch_id: batchId }
    const outbound = useDB
      ? await dbCreateBooking(outboundData)
      : bookingStore.create(outboundData)
    const created = [outbound]

    if (round_trip && return_time) {
      const inboundData = {
        ...base,
        direction: '返程' as const,
        service_time: return_time,
        service_date: return_date || base.service_date,
        pickup_address: base.dropoff_address,
        dropoff_address: base.pickup_address,
        batch_id: batchId,
      }
      const inbound = useDB
        ? await dbCreateBooking(inboundData)
        : bookingStore.create(inboundData)
      created.push(inbound)
    }
    await writeLog(session, AUDIT.BOOKING_CREATE, 'booking_records', created[0]?.id, { count: created.length, batch_id: batchId })
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/bookings]', e)
    return API_ERRORS.SERVER_ERROR('建立失敗，請確認資料庫連線')
  }
}
