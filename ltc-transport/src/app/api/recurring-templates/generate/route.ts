import { NextRequest } from 'next/server'
import { requireRole, apiSuccess, apiError } from '@/lib/api-helpers'
import { writeLog, AUDIT } from '@/lib/audit'
import type { RecurringTemplate, BookingRecord } from '@/types'

const USE_DB = !!process.env.DATABASE_URL

// 把 YYYY-MM-DD 字串轉成週幾 (0=週日)
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}

// 產生日期區間內的所有日期
function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export interface GenerateResult {
  created: number
  skipped: number
  bookings: Pick<BookingRecord, 'id' | 'passenger_id' | 'service_date' | 'service_time' | 'direction'>[]
}

// ── POST /api/recurring-templates/generate ───────────────────
// Body: { start_date, end_date, care_unit_id?, template_ids?: string[] }
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('org_admin', 'system_admin')
  if (error) return error

  const body = await req.json() as {
    start_date: string
    end_date: string
    care_unit_id?: string
    template_ids?: string[]
  }

  let { start_date, end_date, care_unit_id, template_ids } = body

  // org_admin 強制使用自己的機構 ID
  if (session.role === 'org_admin') {
    care_unit_id = session.org_id
  }

  if (!start_date || !end_date) {
    return apiError('缺少必要欄位：start_date, end_date', 400)
  }
  if (start_date > end_date) {
    return apiError('start_date 不得晚於 end_date', 400)
  }

  const dates = dateRange(start_date, end_date)
  if (dates.length > 93) {
    return apiError('日期區間最多不超過 93 天（約 3 個月）', 400)
  }

  // 取得所有啟用中範本
  let templates: RecurringTemplate[] = []

  if (USE_DB) {
    const { dbListTemplates } = await import('@/lib/queries/recurringTemplates')
    templates = await dbListTemplates(care_unit_id)
  } else {
    const g = globalThis as { __recurringTemplates?: RecurringTemplate[] }
    templates = g.__recurringTemplates ?? []
    if (care_unit_id) templates = templates.filter(t => t.care_unit_id === care_unit_id)
  }

  templates = templates.filter(t => t.is_active)
  if (template_ids?.length) {
    templates = templates.filter(t => template_ids.includes(t.id))
  }

  if (!templates.length) {
    return apiSuccess<GenerateResult>({ created: 0, skipped: 0, bookings: [] })
  }

  const result: GenerateResult = { created: 0, skipped: 0, bookings: [] }

  if (USE_DB) {
    const sql = (await import('@/lib/pg')).default

    // 取得已存在的訂單（用來去重）
    const existing = await sql`
      SELECT passenger_id, service_date, direction
      FROM booking_records
      WHERE service_date BETWEEN ${start_date} AND ${end_date}
        AND status != '取消'
    ` as { passenger_id: string; service_date: string; direction: string }[]

    const existingSet = new Set(
      existing.map(r => `${r.passenger_id}|${String(r.service_date).split('T')[0]}|${r.direction}`)
    )

    for (const tmpl of templates) {
      for (const date of dates) {
        if (getDayOfWeek(date) !== tmpl.day_of_week) continue
        const key = `${tmpl.passenger_id}|${date}|${tmpl.direction}`
        if (existingSet.has(key)) { result.skipped++; continue }

        const [row] = await sql`
          INSERT INTO booking_records
            (care_unit_id, passenger_id, service_date, service_time,
             direction, pickup_address, dropoff_address, wheelchair,
             notes, status, created_by)
          VALUES
            (${tmpl.care_unit_id}, ${tmpl.passenger_id}, ${date}, ${tmpl.service_time},
             ${tmpl.direction}, ${tmpl.pickup_address ?? null}, ${tmpl.dropoff_address ?? null},
             ${tmpl.wheelchair}, ${tmpl.notes ?? null}, '待指派', ${session.id})
          RETURNING id, passenger_id, service_date, service_time, direction
        ` as { id: string; passenger_id: string; service_date: string; service_time: string; direction: string }[]

        existingSet.add(key)
        result.created++
        result.bookings.push({
          id: row.id,
          passenger_id: row.passenger_id,
          service_date: String(row.service_date).split('T')[0],
          service_time: row.service_time,
          direction: row.direction as BookingRecord['direction'],
        })
      }
    }

    await writeLog(session, AUDIT.BOOKING_CREATE, 'recurring_generate', undefined, {
      start_date, end_date, created: result.created, skipped: result.skipped,
    })
  } else {
    // Memory mode
    const { bookingStore } = await import('@/lib/store')
    const allMem = bookingStore.list()

    const existingSet = new Set(
      allMem
        .filter(b => b.status !== '取消' && b.service_date >= start_date && b.service_date <= end_date)
        .map(b => `${b.passenger_id}|${b.service_date}|${b.direction}`)
    )

    for (const tmpl of templates) {
      for (const date of dates) {
        if (getDayOfWeek(date) !== tmpl.day_of_week) continue
        const key = `${tmpl.passenger_id}|${date}|${tmpl.direction}`
        if (existingSet.has(key)) { result.skipped++; continue }

        const newBooking = bookingStore.create({
          care_unit_id: tmpl.care_unit_id,
          passenger_id: tmpl.passenger_id,
          booking_date: new Date().toISOString().split('T')[0],
          service_date: date,
          service_time: tmpl.service_time,
          direction: tmpl.direction,
          pickup_address: tmpl.pickup_address,
          dropoff_address: tmpl.dropoff_address,
          wheelchair: tmpl.wheelchair,
          notes: tmpl.notes,
          created_by: session.id,
        })
        existingSet.add(key)
        result.created++
        result.bookings.push({
          id: newBooking.id,
          passenger_id: newBooking.passenger_id,
          service_date: newBooking.service_date,
          service_time: newBooking.service_time,
          direction: newBooking.direction,
        })
      }
    }
  }

  return apiSuccess(result, 201)
}
