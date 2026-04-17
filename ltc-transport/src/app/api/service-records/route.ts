import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/pg'
import { requireAuth, requireRole, API_ERRORS } from '@/lib/api-helpers'
import { dbFindDriverByUserId } from '@/lib/queries/drivers'

const useDB = !!process.env.DATABASE_URL

const memStore: Record<string, unknown>[] = []

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const bookingId = req.nextUrl.searchParams.get('booking_id') ?? undefined

  try {
    if (useDB) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: any[]

      if (session.role === 'driver') {
        const driver = await dbFindDriverByUserId(session.id)
        if (!driver) return NextResponse.json({ data: [] })
        rows = bookingId
          ? await sql`SELECT * FROM service_records WHERE booking_id = ${bookingId} AND driver_id = ${driver.id} ORDER BY created_at DESC`
          : await sql`SELECT * FROM service_records WHERE driver_id = ${driver.id} ORDER BY service_date DESC, service_time DESC LIMIT 100`
      } else if (session.role === 'org_admin') {
        rows = bookingId
          ? await sql`SELECT * FROM service_records WHERE booking_id = ${bookingId} AND care_unit_id = ${session.org_id!} ORDER BY created_at DESC`
          : await sql`SELECT * FROM service_records WHERE care_unit_id = ${session.org_id!} ORDER BY service_date DESC, service_time DESC LIMIT 100`
      } else if (session.role === 'fleet_admin') {
        rows = bookingId
          ? await sql`
              SELECT sr.* FROM service_records sr
              JOIN drivers d ON d.id = sr.driver_id
              WHERE sr.booking_id = ${bookingId} AND d.company_id = ${session.org_id!}
              ORDER BY sr.created_at DESC
            `
          : await sql`
              SELECT sr.* FROM service_records sr
              JOIN drivers d ON d.id = sr.driver_id
              WHERE d.company_id = ${session.org_id!}
              ORDER BY sr.service_date DESC, sr.service_time DESC LIMIT 100
            `
      } else {
        rows = bookingId
          ? await sql`SELECT * FROM service_records WHERE booking_id = ${bookingId} ORDER BY created_at DESC`
          : await sql`SELECT * FROM service_records ORDER BY service_date DESC, service_time DESC LIMIT 100`
      }

      return NextResponse.json({ data: rows })
    }

    // 記憶體模式
    const list = bookingId ? memStore.filter(r => r.booking_id === bookingId) : memStore.slice(-100)
    return NextResponse.json({ data: list })
  } catch (e) {
    console.error('[GET /api/service-records]', e)
    return NextResponse.json({ data: memStore })
  }
}

export async function POST(req: NextRequest) {
  // 只有駕駛、機構管理員與系統管理員可建立服務明細
  const { session, error } = await requireRole('driver', 'org_admin', 'system_admin')
  if (error) return error

  try {
    const body = await req.json()
    const {
      booking_id, task_id, care_unit_id, passenger_id, driver_id, vehicle_id,
      service_date, service_time, pickup_address, dropoff_location,
      actual_pickup_time, actual_dropoff_time, distance_km, notes,
    } = body

    if (!booking_id) {
      return NextResponse.json({ error: '缺少 booking_id' }, { status: 400 })
    }

    // 駕駛：強制使用自己的 driver_id，不接受客戶端傳入
    let resolvedDriverId = driver_id
    if (session.role === 'driver') {
      if (useDB) {
        const driver = await dbFindDriverByUserId(session.id)
        if (!driver) return API_ERRORS.FORBIDDEN()
        // 確認此 booking 確實指派給自己
        const rows = await sql`SELECT 1 FROM task_assignments WHERE booking_id = ${booking_id} AND driver_id = ${driver.id} LIMIT 1`
        if (rows.length === 0) return API_ERRORS.FORBIDDEN()
        resolvedDriverId = driver.id
      }
    }

    const orderNum = `ORD-${service_date?.replace(/-/g, '') ?? new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`

    if (useDB) {
      const rows = await sql`
        INSERT INTO service_records
          (task_id, booking_id, order_number, status, care_unit_id, passenger_id,
           driver_id, vehicle_id, service_date, service_time, pickup_address,
           dropoff_location, actual_pickup_time, actual_dropoff_time, distance_km, notes)
        VALUES
          (${task_id ?? null}, ${booking_id}, ${orderNum}, '已完成',
           ${care_unit_id ?? null}, ${passenger_id ?? null}, ${resolvedDriverId ?? null}, ${vehicle_id ?? null},
           ${service_date ?? null}, ${service_time ?? null}, ${pickup_address ?? null},
           ${dropoff_location ?? null}, ${actual_pickup_time ?? null}, ${actual_dropoff_time ?? null},
           ${distance_km ? Number(distance_km) : null}, ${notes ?? null})
        RETURNING *
      `
      return NextResponse.json({ data: rows[0] }, { status: 201 })
    }

    const rec = { id: crypto.randomUUID(), order_number: orderNum, status: '已完成', ...body, driver_id: resolvedDriverId, created_at: new Date().toISOString() }
    memStore.push(rec)
    return NextResponse.json({ data: rec }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/service-records]', e)
    return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
  }
}
