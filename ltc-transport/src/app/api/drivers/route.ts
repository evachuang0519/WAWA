import { NextRequest, NextResponse } from 'next/server'
import { dbListDrivers, dbCreateDriver } from '@/lib/queries/drivers'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'
import { DRIVERS } from '@/lib/db'

const useDB = !!process.env.DATABASE_URL

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole('fleet_admin', 'system_admin', 'org_admin')
  if (error) return error

  // fleet_admin 強制只看自己車行的駕駛
  let companyId: string | undefined
  if (session.role === 'fleet_admin') {
    companyId = session.org_id
  } else if (session.role === 'system_admin') {
    companyId = req.nextUrl.searchParams.get('company_id') ?? undefined
  }
  // org_admin 可看所有駕駛（排班需要）

  try {
    if (useDB) {
      const list = await dbListDrivers(companyId)
      return NextResponse.json({ data: list })
    }
    const list = companyId ? DRIVERS.filter(d => d.company_id === companyId) : DRIVERS
    return NextResponse.json({ data: list })
  } catch (e) {
    console.error('[GET /api/drivers]', e)
    return NextResponse.json({ data: DRIVERS })
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('fleet_admin', 'system_admin')
  if (error) return error

  try {
    const body = await req.json()
    if (!body.name) {
      return NextResponse.json({ error: '姓名為必填' }, { status: 400 })
    }
    // fleet_admin 強制使用自己車行的 ID
    if (session.role === 'fleet_admin') {
      body.company_id = session.org_id
    }
    if (!body.company_id) {
      return NextResponse.json({ error: '車行為必填' }, { status: 400 })
    }
    if (useDB) {
      const d = await dbCreateDriver(body)
      return NextResponse.json({ data: d }, { status: 201 })
    }
    return NextResponse.json({ data: { ...body, id: crypto.randomUUID() } }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/drivers]', e)
    return NextResponse.json({ error: '新增失敗' }, { status: 500 })
  }
}
