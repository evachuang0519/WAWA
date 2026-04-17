import { NextRequest } from 'next/server'
import { bookingStore } from '@/lib/store'
import { dbFindBooking, dbUpdateBooking, dbCancelBooking } from '@/lib/queries/bookings'
import { dbFindDriverByUserId } from '@/lib/queries/drivers'
import { requireAuth, API_ERRORS, apiSuccess } from '@/lib/api-helpers'
import { writeLog, AUDIT } from '@/lib/audit'

type Ctx = { params: Promise<{ id: string }> }

const useDB = !!process.env.DATABASE_URL

/** 驗證 driver session 是否有此訂單的任務指派 */
async function driverHasBooking(sessionUserId: string, bookingId: string): Promise<boolean> {
  if (useDB) {
    const driver = await dbFindDriverByUserId(sessionUserId)
    if (!driver) return false
    const sql = (await import('@/lib/pg')).default
    const rows = await sql`SELECT 1 FROM task_assignments WHERE booking_id = ${bookingId} AND driver_id = ${driver.id} LIMIT 1`
    return rows.length > 0
  }
  const { TASK_ASSIGNMENTS, DRIVERS } = await import('@/lib/db')
  const driver = DRIVERS.find(d => d.user_id === sessionUserId)
  if (!driver) return false
  return TASK_ASSIGNMENTS.some(t => t.booking_id === bookingId && t.driver_id === driver.id)
}

export async function GET(_: NextRequest, ctx: Ctx) {
  const { session, error } = await requireAuth()
  if (error) return error
  const { id } = await ctx.params

  try {
    const booking = useDB ? await dbFindBooking(id) : bookingStore.find(id)
    if (!booking) return API_ERRORS.NOT_FOUND()

    if (session.role === 'org_admin' && booking.care_unit_id !== session.org_id) return API_ERRORS.FORBIDDEN()
    if (session.role === 'fleet_admin') {
      // fleet_admin 可看待指派訂單，或自己車行已指派的訂單
      if (booking.status !== '待指派') {
        if (useDB) {
          const sql = (await import('@/lib/pg')).default
          const rows = await sql`
            SELECT 1 FROM task_assignments ta JOIN vehicles v ON v.id = ta.vehicle_id
            WHERE ta.booking_id = ${id} AND v.company_id = ${session.org_id!} LIMIT 1
          `
          if (rows.length === 0) return API_ERRORS.FORBIDDEN()
        } else {
          const { TASK_ASSIGNMENTS, VEHICLES } = await import('@/lib/db')
          const ta = TASK_ASSIGNMENTS.find(t => t.booking_id === id)
          const v = ta ? VEHICLES.find(v => v.id === ta.vehicle_id) : undefined
          if (v?.company_id !== session.org_id) return API_ERRORS.FORBIDDEN()
        }
      }
    }
    if (session.role === 'driver') {
      if (!await driverHasBooking(session.id, id)) return API_ERRORS.FORBIDDEN()
    }

    return apiSuccess(booking)
  } catch (e) {
    console.error('[GET /api/bookings/:id]', e)
    const booking = bookingStore.find(id)
    if (!booking) return API_ERRORS.NOT_FOUND()
    return apiSuccess(booking)
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { session, error } = await requireAuth()
  if (error) return error

  try {
    const { id } = await ctx.params
    const patch = await req.json()

    const booking = useDB ? await dbFindBooking(id) : bookingStore.find(id)
    if (!booking) return API_ERRORS.NOT_FOUND()

    if (session.role === 'org_admin') {
      if (booking.care_unit_id !== session.org_id) return API_ERRORS.FORBIDDEN()
    } else if (session.role === 'driver') {
      // 駕駛只能更新自己任務的 status
      if (!await driverHasBooking(session.id, id)) return API_ERRORS.FORBIDDEN()
      if (!patch.status) return API_ERRORS.FORBIDDEN()
      const updated = useDB
        ? await dbUpdateBooking(id, { status: patch.status })
        : bookingStore.update(id, { status: patch.status })
      if (!updated) return API_ERRORS.NOT_FOUND()
      await writeLog(session, AUDIT.BOOKING_UPDATE, 'booking_records', id, { status: patch.status })
      return apiSuccess(updated)
    } else if (session.role === 'fleet_admin') {
      return API_ERRORS.FORBIDDEN()
    } else if (session.role !== 'system_admin') {
      return API_ERRORS.FORBIDDEN()
    }

    const updated = useDB
      ? await dbUpdateBooking(id, patch)
      : bookingStore.update(id, patch)
    if (!updated) return API_ERRORS.NOT_FOUND()
    await writeLog(session, AUDIT.BOOKING_UPDATE, 'booking_records', id, { patch })
    return apiSuccess(updated)
  } catch (e) {
    console.error('[PATCH /api/bookings/:id]', e)
    return API_ERRORS.SERVER_ERROR('更新失敗')
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const { session, error } = await requireAuth()
  if (error) return error
  if (!['org_admin', 'system_admin'].includes(session.role)) return API_ERRORS.FORBIDDEN()

  const { id } = await ctx.params
  try {
    if (session.role === 'org_admin') {
      const booking = useDB ? await dbFindBooking(id) : bookingStore.find(id)
      if (!booking) return API_ERRORS.NOT_FOUND()
      if (booking.care_unit_id !== session.org_id) return API_ERRORS.FORBIDDEN()
    }

    const cancelled = useDB
      ? await dbCancelBooking(id)
      : bookingStore.cancel(id)
    if (!cancelled) return API_ERRORS.NOT_FOUND()
    await writeLog(session, AUDIT.BOOKING_CANCEL, 'booking_records', id)
    return apiSuccess(cancelled)
  } catch (e) {
    console.error('[DELETE /api/bookings/:id]', e)
    return API_ERRORS.SERVER_ERROR('取消失敗')
  }
}
