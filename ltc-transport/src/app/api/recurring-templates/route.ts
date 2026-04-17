import { NextRequest, NextResponse } from 'next/server'
import { requireRole, apiSuccess, apiError, API_ERRORS } from '@/lib/api-helpers'
import { writeLog, AUDIT } from '@/lib/audit'
import type { RecurringTemplate, DayOfWeek } from '@/types'

const USE_DB = !!process.env.DATABASE_URL

// ── Memory store ──────────────────────────────────────────────
declare global { var __recurringTemplates: RecurringTemplate[] | undefined }
function memStore(): RecurringTemplate[] {
  if (!globalThis.__recurringTemplates) globalThis.__recurringTemplates = []
  return globalThis.__recurringTemplates
}

// ── GET /api/recurring-templates ─────────────────────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireRole('org_admin', 'system_admin')
  if (error) return error

  // org_admin 強制只看自己機構的範本；system_admin 可透過 query param 篩選
  let careUnitId: string | undefined
  if (session.role === 'org_admin') {
    careUnitId = session.org_id
  } else {
    careUnitId = req.nextUrl.searchParams.get('care_unit_id') ?? undefined
  }

  if (USE_DB) {
    const { dbListTemplates } = await import('@/lib/queries/recurringTemplates')
    const data = await dbListTemplates(careUnitId)
    return apiSuccess(data)
  }

  // Memory mode
  let list = memStore()
  if (careUnitId) list = list.filter(t => t.care_unit_id === careUnitId)
  return apiSuccess(list)
}

// ── POST /api/recurring-templates ────────────────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('org_admin', 'system_admin')
  if (error) return error

  const body = await req.json() as Partial<RecurringTemplate>

  // org_admin 強制使用自己的機構 ID
  if (session.role === 'org_admin') {
    body.care_unit_id = session.org_id
  }

  const { care_unit_id, passenger_id, day_of_week, service_time, direction } = body

  if (!care_unit_id || !passenger_id || day_of_week === undefined || !service_time || !direction) {
    return apiError('缺少必要欄位：care_unit_id, passenger_id, day_of_week, service_time, direction', 400)
  }

  if (USE_DB) {
    const { dbCreateTemplate } = await import('@/lib/queries/recurringTemplates')
    const tmpl = await dbCreateTemplate({
      care_unit_id,
      passenger_id,
      day_of_week: day_of_week as DayOfWeek,
      service_time,
      direction,
      pickup_address: body.pickup_address,
      dropoff_address: body.dropoff_address,
      wheelchair: body.wheelchair ?? false,
      notes: body.notes,
      is_active: body.is_active ?? true,
      created_by: session.id,
    })
    await writeLog(session, AUDIT.BOOKING_CREATE, 'recurring_template', tmpl.id)
    return apiSuccess(tmpl, 201)
  }

  // Memory mode
  const { PASSENGERS, CARE_UNITS } = await import('@/lib/db')
  const newTmpl: RecurringTemplate = {
    id: crypto.randomUUID(),
    care_unit_id,
    care_unit: CARE_UNITS.find(c => c.id === care_unit_id),
    passenger_id,
    passenger: PASSENGERS.find(p => p.id === passenger_id),
    day_of_week: day_of_week as DayOfWeek,
    service_time,
    direction,
    pickup_address: body.pickup_address,
    dropoff_address: body.dropoff_address,
    wheelchair: body.wheelchair ?? false,
    notes: body.notes,
    is_active: body.is_active ?? true,
    created_by: session.id,
    created_at: new Date().toISOString(),
  }
  memStore().push(newTmpl)
  return apiSuccess(newTmpl, 201)
}
