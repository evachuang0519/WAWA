import { NextRequest, NextResponse } from 'next/server'
import { dbFindPassenger, dbUpdatePassenger } from '@/lib/queries/passengers'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'
import { PASSENGERS } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }
const useDB = !!process.env.DATABASE_URL

export async function GET(_: NextRequest, ctx: Ctx) {
  const { session, error } = await requireRole('org_admin', 'system_admin', 'fleet_admin')
  if (error) return error

  const { id } = await ctx.params
  try {
    if (useDB) {
      const p = await dbFindPassenger(id)
      if (!p) return NextResponse.json({ error: '找不到個案' }, { status: 404 })
      if (session.role === 'org_admin' && p.care_unit_id !== session.org_id) return API_ERRORS.FORBIDDEN()
      return NextResponse.json({ data: p })
    }
    const p = PASSENGERS.find(p => p.id === id)
    if (!p) return NextResponse.json({ error: '找不到個案' }, { status: 404 })
    if (session.role === 'org_admin' && p.care_unit_id !== session.org_id) return API_ERRORS.FORBIDDEN()
    return NextResponse.json({ data: p })
  } catch (e) {
    console.error('[GET /api/passengers/:id]', e)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { session, error } = await requireRole('org_admin', 'system_admin')
  if (error) return error

  const { id } = await ctx.params
  try {
    const body = await req.json()

    // 先確認所有權
    if (session.role === 'org_admin') {
      const existing = useDB ? await dbFindPassenger(id) : PASSENGERS.find(p => p.id === id)
      if (!existing) return NextResponse.json({ error: '找不到個案' }, { status: 404 })
      if (existing.care_unit_id !== session.org_id) return API_ERRORS.FORBIDDEN()
      // 不允許變更所屬機構
      delete body.care_unit_id
    }

    if (useDB) {
      const p = await dbUpdatePassenger(id, body)
      if (!p) return NextResponse.json({ error: '找不到個案' }, { status: 404 })
      return NextResponse.json({ data: p })
    }
    const existing = PASSENGERS.find(p => p.id === id)
    if (!existing) return NextResponse.json({ error: '找不到個案' }, { status: 404 })
    return NextResponse.json({ data: { ...existing, ...body } })
  } catch (e) {
    console.error('[PATCH /api/passengers/:id]', e)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}
