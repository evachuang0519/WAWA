import { NextRequest, NextResponse } from 'next/server'
import { dbFindCareUnit, dbUpdateCareUnit } from '@/lib/queries/care_units'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'

const useDB = !!process.env.DATABASE_URL

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('system_admin', 'org_admin', 'fleet_admin')
  if (error) return error

  const { id } = await ctx.params
  // org_admin 只能看自己的機構
  if (session.role === 'org_admin' && id !== session.org_id) return API_ERRORS.FORBIDDEN()

  if (!useDB) return NextResponse.json({ error: '需要資料庫連線' }, { status: 503 })
  const cu = await dbFindCareUnit(id)
  return cu ? NextResponse.json({ data: cu }) : NextResponse.json({ error: '找不到' }, { status: 404 })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // org_admin 可更新自己的機構資料，system_admin 可更新任何機構
  const { session, error } = await requireRole('system_admin', 'org_admin')
  if (error) return error

  const { id } = await ctx.params
  if (session.role === 'org_admin' && id !== session.org_id) return API_ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const cu = useDB
      ? await dbUpdateCareUnit(id, body)
      : null
    if (!cu) return NextResponse.json({ error: '找不到或更新失敗' }, { status: 404 })
    return NextResponse.json({ data: cu })
  } catch (e) {
    console.error('[PATCH /api/care-units/:id]', e)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}
