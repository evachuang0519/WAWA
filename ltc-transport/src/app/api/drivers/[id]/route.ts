import { NextRequest, NextResponse } from 'next/server'
import { dbUpdateDriver, dbListDrivers } from '@/lib/queries/drivers'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'
import { DRIVERS } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }
const useDB = !!process.env.DATABASE_URL

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { session, error } = await requireRole('fleet_admin', 'system_admin')
  if (error) return error

  const { id } = await ctx.params
  try {
    const body = await req.json()

    // fleet_admin 確認該駕駛屬於自己車行
    if (session.role === 'fleet_admin') {
      if (useDB) {
        const list = await dbListDrivers(session.org_id)
        if (!list.find(d => d.id === id)) return API_ERRORS.FORBIDDEN()
      } else {
        const existing = DRIVERS.find(d => d.id === id)
        if (!existing || existing.company_id !== session.org_id) return API_ERRORS.FORBIDDEN()
      }
      // 不允許變更所屬車行
      delete body.company_id
    }

    if (useDB) {
      const d = await dbUpdateDriver(id, body)
      if (!d) return NextResponse.json({ error: '找不到駕駛' }, { status: 404 })
      return NextResponse.json({ data: d })
    }
    const existing = DRIVERS.find(d => d.id === id)
    if (!existing) return NextResponse.json({ error: '找不到駕駛' }, { status: 404 })
    return NextResponse.json({ data: { ...existing, ...body } })
  } catch (e) {
    console.error('[PATCH /api/drivers/:id]', e)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}
