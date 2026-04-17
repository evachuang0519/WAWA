import { NextRequest, NextResponse } from 'next/server'
import { dbFindCompany, dbUpdateCompany } from '@/lib/queries/companies'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'

const useDB = !!process.env.DATABASE_URL

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole('system_admin', 'fleet_admin', 'org_admin')
  if (error) return error

  const { id } = await ctx.params
  // fleet_admin 只能看自己的車行
  if (session.role === 'fleet_admin' && id !== session.org_id) return API_ERRORS.FORBIDDEN()

  if (!useDB) return NextResponse.json({ error: '需要資料庫連線' }, { status: 503 })
  const co = await dbFindCompany(id)
  return co ? NextResponse.json({ data: co }) : NextResponse.json({ error: '找不到' }, { status: 404 })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // fleet_admin 可更新自己的車行資料，system_admin 可更新任何車行
  const { session, error } = await requireRole('system_admin', 'fleet_admin')
  if (error) return error

  const { id } = await ctx.params
  if (session.role === 'fleet_admin' && id !== session.org_id) return API_ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const co = useDB ? await dbUpdateCompany(id, body) : null
    if (!co) return NextResponse.json({ error: '找不到或更新失敗' }, { status: 404 })
    return NextResponse.json({ data: co })
  } catch (e) {
    console.error('[PATCH /api/companies/:id]', e)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}
