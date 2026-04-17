import { NextRequest, NextResponse } from 'next/server'
import { dbUpdateVehicle, dbListVehicles } from '@/lib/queries/vehicles'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'
import { VEHICLES } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }
const useDB = !!process.env.DATABASE_URL

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { session, error } = await requireRole('fleet_admin', 'system_admin')
  if (error) return error

  const { id } = await ctx.params
  try {
    const body = await req.json()

    // fleet_admin 確認該車輛屬於自己車行
    if (session.role === 'fleet_admin') {
      if (useDB) {
        const list = await dbListVehicles(session.org_id)
        if (!list.find(v => v.id === id)) return API_ERRORS.FORBIDDEN()
      } else {
        const existing = VEHICLES.find(v => v.id === id)
        if (!existing || existing.company_id !== session.org_id) return API_ERRORS.FORBIDDEN()
      }
      // 不允許變更所屬車行
      delete body.company_id
    }

    if (useDB) {
      const v = await dbUpdateVehicle(id, body)
      if (!v) return NextResponse.json({ error: '找不到車輛' }, { status: 404 })
      return NextResponse.json({ data: v })
    }
    const existing = VEHICLES.find(v => v.id === id)
    if (!existing) return NextResponse.json({ error: '找不到車輛' }, { status: 404 })
    return NextResponse.json({ data: { ...existing, ...body } })
  } catch (e) {
    console.error('[PATCH /api/vehicles/:id]', e)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}
