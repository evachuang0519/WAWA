import { NextRequest, NextResponse } from 'next/server'
import { eventStore } from '@/lib/eventStore'
import { dbUpdateBooking } from '@/lib/queries/bookings'
import { bookingStore } from '@/lib/store'
import sql from '@/lib/pg'
import type { BookingRecord } from '@/types'

type Ctx = { params: Promise<{ id: string }> }

const useDB = !!process.env.DATABASE_URL

const EVENT_STATUS: Record<string, string> = {
  started: '進行中',
  completed: '已完成',
  cancelled: '取消',
}

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  if (useDB) {
    try {
      const rows = await sql`
        SELECT * FROM booking_events WHERE booking_id = ${id} ORDER BY timestamp ASC
      `
      return NextResponse.json({ data: rows })
    } catch {
      // fallback to memory
    }
  }
  return NextResponse.json({ data: eventStore.list(id) })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const body = await req.json()
    const { event_type, lat, lng, accuracy, driver_id, note } = body

    if (!event_type) {
      return NextResponse.json({ error: '缺少 event_type' }, { status: 400 })
    }

    let event: Record<string, unknown>

    if (useDB) {
      const rows = await sql`
        INSERT INTO booking_events (booking_id, event_type, driver_id, lat, lng, accuracy, note)
        VALUES (${id}, ${event_type}, ${driver_id ?? null}, ${lat ?? null}, ${lng ?? null},
                ${accuracy ?? null}, ${note ?? null})
        RETURNING *
      `
      event = rows[0]
    } else {
      event = eventStore.add({ booking_id: id, event_type, lat, lng, accuracy, driver_id, note })
    }

    // Update booking status if applicable
    const newStatus = EVENT_STATUS[event_type]
    if (newStatus) {
      try {
        if (useDB) {
          await dbUpdateBooking(id, { status: newStatus as BookingRecord['status'] })
        } else {
          bookingStore.update(id, { status: newStatus as BookingRecord['status'] })
        }
      } catch (e) {
        console.error('[POST events] status update failed', e)
      }
    }

    return NextResponse.json({ data: event }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/bookings/:id/events]', e)
    return NextResponse.json({ error: '記錄失敗' }, { status: 500 })
  }
}
