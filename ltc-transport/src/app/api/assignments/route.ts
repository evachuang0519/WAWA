import { NextRequest } from 'next/server'
import { dbCreateAssignment, dbListAssignments } from '@/lib/queries/assignments'
import { dbUpdateBooking } from '@/lib/queries/bookings'
import { bookingStore } from '@/lib/store'
import { TASK_ASSIGNMENTS, DRIVERS, VEHICLES } from '@/lib/db'
import { requireRole, API_ERRORS, apiSuccess } from '@/lib/api-helpers'
import { writeLog, AUDIT } from '@/lib/audit'

const useDB = !!process.env.DATABASE_URL

export async function GET() {
  const { session, error } = await requireRole('fleet_admin', 'system_admin')
  if (error) return error

  // fleet_admin 只能看自己車行的指派記錄
  const companyId = session.role === 'fleet_admin' ? session.org_id : undefined

  try {
    if (useDB) {
      const list = await dbListAssignments(companyId)
      return apiSuccess(list)
    }
    const list = companyId
      ? TASK_ASSIGNMENTS.filter(ta => {
          const driver = DRIVERS.find(d => d.id === ta.driver_id)
          return driver?.company_id === companyId
        })
      : TASK_ASSIGNMENTS
    return apiSuccess(list)
  } catch (e) {
    console.error('[GET /api/assignments]', e)
    return apiSuccess(TASK_ASSIGNMENTS)
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('fleet_admin', 'system_admin')
  if (error) return error

  try {
    const { booking_id, driver_id, vehicle_id, notes } = await req.json()
    if (!booking_id || !driver_id || !vehicle_id) {
      return API_ERRORS.BAD_REQUEST('請選擇駕駛與車輛')
    }

    // fleet_admin 必須確認駕駛與車輛都屬於自己車行
    if (session.role === 'fleet_admin') {
      const companyId = session.org_id!
      if (useDB) {
        const sql = (await import('@/lib/pg')).default
        const [driverRows, vehicleRows] = await Promise.all([
          sql`SELECT 1 FROM drivers WHERE id = ${driver_id} AND company_id = ${companyId} LIMIT 1`,
          sql`SELECT 1 FROM vehicles WHERE id = ${vehicle_id} AND company_id = ${companyId} LIMIT 1`,
        ])
        if (driverRows.length === 0 || vehicleRows.length === 0) return API_ERRORS.FORBIDDEN()
      } else {
        const driver = DRIVERS.find(d => d.id === driver_id)
        const vehicle = VEHICLES.find(v => v.id === vehicle_id)
        if (driver?.company_id !== companyId || vehicle?.company_id !== companyId) {
          return API_ERRORS.FORBIDDEN()
        }
      }
    }

    if (useDB) {
      const sql = (await import('@/lib/pg')).default
      const target = await sql`
        SELECT br.service_date, br.service_time
        FROM booking_records br WHERE br.id = ${booking_id}
      ` as { service_date: string; service_time: string }[]

      let conflictWarning: string | undefined
      if (target.length) {
        const { service_date, service_time } = target[0]
        const conflicts = await sql`
          SELECT br.service_time, br.id
          FROM task_assignments ta
          JOIN booking_records br ON br.id = ta.booking_id
          WHERE ta.driver_id = ${driver_id}
            AND br.service_date = ${String(service_date).split('T')[0]}
            AND br.id != ${booking_id}
            AND br.status NOT IN ('取消','已完成','請假')
        ` as { service_time: string; id: string }[]

        if (conflicts.length) {
          const times = conflicts.map(c => c.service_time).filter(Boolean).join('、')
          conflictWarning = `駕駛在同日已有任務（${times || '時間未設定'}），請確認時段是否衝突`
        }
      }

      const assignment = await dbCreateAssignment({ booking_id, driver_id, vehicle_id, notes })
      await dbUpdateBooking(booking_id, { status: '已指派' })
      await writeLog(session, AUDIT.ASSIGN_CREATE, 'task_assignments', assignment.id, { booking_id, driver_id, vehicle_id })
      return apiSuccess({ ...assignment, warning: conflictWarning }, 201)
    }

    // Memory mode
    const { TASK_ASSIGNMENTS: MEM_TA } = await import('@/lib/db')
    const targetBooking = bookingStore.find(booking_id)
    let memWarning: string | undefined
    if (targetBooking) {
      const driverBookingIds = MEM_TA
        .filter(ta => ta.driver_id === driver_id)
        .map(ta => ta.booking_id)
      const conflicts = bookingStore.list().filter(b =>
        driverBookingIds.includes(b.id) &&
        b.id !== booking_id &&
        b.service_date === targetBooking.service_date &&
        !['取消', '已完成', '請假'].includes(b.status)
      )
      if (conflicts.length) {
        const times = conflicts.map(c => c.service_time).filter(Boolean).join('、')
        memWarning = `駕駛在同日已有任務（${times || '時間未設定'}），請確認時段是否衝突`
      }
    }

    bookingStore.update(booking_id, { status: '已指派' })
    const assignment = {
      id: crypto.randomUUID(),
      booking_id,
      driver_id,
      vehicle_id,
      notes,
      assigned_at: new Date().toISOString().split('T')[0],
    }
    await writeLog(session, AUDIT.ASSIGN_CREATE, 'task_assignments', assignment.id, { booking_id, driver_id, vehicle_id })
    return apiSuccess({ ...assignment, warning: memWarning }, 201)
  } catch (e) {
    console.error('[POST /api/assignments]', e)
    return API_ERRORS.SERVER_ERROR('指派失敗，請稍後再試')
  }
}
