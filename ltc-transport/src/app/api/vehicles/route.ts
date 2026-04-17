import { NextRequest, NextResponse } from 'next/server'
import { dbListVehicles, dbCreateVehicle } from '@/lib/queries/vehicles'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'
import { VEHICLES } from '@/lib/db'

const useDB = !!process.env.DATABASE_URL

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole('fleet_admin', 'system_admin', 'org_admin')
  if (error) return error

  // fleet_admin 強制只看自己車行的車輛
  let companyId: string | undefined
  if (session.role === 'fleet_admin') {
    companyId = session.org_id
  } else if (session.role === 'system_admin') {
    companyId = req.nextUrl.searchParams.get('company_id') ?? undefined
  }
  // org_admin 可看所有車輛（指派時需要）

  try {
    if (useDB) {
      const list = await dbListVehicles(companyId)
      return NextResponse.json({ data: list })
    }
    const list = companyId ? VEHICLES.filter(v => v.company_id === companyId) : VEHICLES
    return NextResponse.json({ data: list })
  } catch (e) {
    console.error('[GET /api/vehicles]', e)
    return NextResponse.json({ data: VEHICLES })
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('fleet_admin', 'system_admin')
  if (error) return error

  try {
    const body = await req.json()
    if (!body.plate_number) {
      return NextResponse.json({ error: '車牌號碼為必填' }, { status: 400 })
    }
    // fleet_admin 強制使用自己車行的 ID
    if (session.role === 'fleet_admin') {
      body.company_id = session.org_id
    }
    if (!body.company_id) {
      return NextResponse.json({ error: '車行為必填' }, { status: 400 })
    }
    if (useDB) {
      const v = await dbCreateVehicle(body)
      return NextResponse.json({ data: v }, { status: 201 })
    }
    return NextResponse.json({ data: { ...body, id: crypto.randomUUID() } }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/vehicles]', e)
    return NextResponse.json({ error: '新增失敗' }, { status: 500 })
  }
}
