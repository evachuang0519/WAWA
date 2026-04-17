import { NextRequest, NextResponse } from 'next/server'
import { dbListPassengers, dbCreatePassenger } from '@/lib/queries/passengers'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'
import { PASSENGERS } from '@/lib/db'

const useDB = !!process.env.DATABASE_URL

export async function GET(req: NextRequest) {
  // fleet_admin 在指派時需讀取個案基本資訊，故也允許
  const { session, error } = await requireRole('org_admin', 'system_admin', 'fleet_admin')
  if (error) return error

  // org_admin 強制只看自己機構；system_admin 可透過 query param 篩選
  let careUnitId: string | undefined
  if (session.role === 'org_admin') {
    careUnitId = session.org_id
  } else if (session.role === 'system_admin') {
    careUnitId = req.nextUrl.searchParams.get('care_unit_id') ?? undefined
  }
  // fleet_admin 可看全部（指派時需要乘客資訊）

  try {
    if (useDB) {
      const list = await dbListPassengers(careUnitId)
      return NextResponse.json({ data: list })
    }
    const list = careUnitId ? PASSENGERS.filter(p => p.care_unit_id === careUnitId) : PASSENGERS
    return NextResponse.json({ data: list })
  } catch (e) {
    console.error('[GET /api/passengers]', e)
    return API_ERRORS.SERVER_ERROR()
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('org_admin', 'system_admin')
  if (error) return error

  try {
    const body = await req.json()
    if (!body.name) {
      return NextResponse.json({ error: '姓名為必填' }, { status: 400 })
    }
    // org_admin 強制使用自己的機構 ID
    if (session.role === 'org_admin') {
      body.care_unit_id = session.org_id
    }
    if (!body.care_unit_id) {
      return NextResponse.json({ error: '機構為必填' }, { status: 400 })
    }
    if (useDB) {
      const p = await dbCreatePassenger(body)
      return NextResponse.json({ data: p }, { status: 201 })
    }
    const p = { ...body, id: crypto.randomUUID() }
    return NextResponse.json({ data: p }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/passengers]', e)
    return NextResponse.json({ error: '新增失敗' }, { status: 500 })
  }
}
