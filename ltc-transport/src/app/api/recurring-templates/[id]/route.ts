import { NextRequest } from 'next/server'
import { requireRole, apiSuccess, API_ERRORS } from '@/lib/api-helpers'
import { writeLog, AUDIT } from '@/lib/audit'
import type { RecurringTemplate } from '@/types'

const USE_DB = !!process.env.DATABASE_URL

// ── PATCH /api/recurring-templates/[id] ──────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('org_admin', 'system_admin')
  if (error) return error

  const { id } = await params
  const body = await req.json() as Partial<RecurringTemplate>

  if (USE_DB) {
    const { dbUpdateTemplate } = await import('@/lib/queries/recurringTemplates')
    const updated = await dbUpdateTemplate(id, body)
    if (!updated) return API_ERRORS.NOT_FOUND()
    await writeLog(session, AUDIT.BOOKING_UPDATE, 'recurring_template', id)
    return apiSuccess(updated)
  }

  // Memory mode
  const { __recurringTemplates } = globalThis as { __recurringTemplates?: RecurringTemplate[] }
  const list = __recurringTemplates ?? []
  const idx = list.findIndex(t => t.id === id)
  if (idx === -1) return API_ERRORS.NOT_FOUND()
  list[idx] = { ...list[idx], ...body, id }
  return apiSuccess(list[idx])
}

// ── DELETE /api/recurring-templates/[id] ─────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('org_admin', 'system_admin')
  if (error) return error

  const { id } = await params

  if (USE_DB) {
    const { dbDeleteTemplate } = await import('@/lib/queries/recurringTemplates')
    const ok = await dbDeleteTemplate(id)
    if (!ok) return API_ERRORS.NOT_FOUND()
    await writeLog(session, AUDIT.BOOKING_UPDATE, 'recurring_template', id, { action: 'delete' })
    return apiSuccess({ id })
  }

  // Memory mode
  const g = globalThis as { __recurringTemplates?: RecurringTemplate[] }
  if (!g.__recurringTemplates) return API_ERRORS.NOT_FOUND()
  const idx = g.__recurringTemplates.findIndex(t => t.id === id)
  if (idx === -1) return API_ERRORS.NOT_FOUND()
  g.__recurringTemplates.splice(idx, 1)
  return apiSuccess({ id })
}
