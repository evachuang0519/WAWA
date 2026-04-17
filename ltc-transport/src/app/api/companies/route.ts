import { NextRequest, NextResponse } from 'next/server'
import { dbListCompanies, dbCreateCompany } from '@/lib/queries/companies'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'
import { TRANSPORT_COMPANIES } from '@/lib/db'

const useDB = !!process.env.DATABASE_URL

export async function GET() {
  const { session, error } = await requireRole('system_admin', 'fleet_admin', 'org_admin')
  if (error) return error

  try {
    if (useDB) {
      const list = await dbListCompanies()
      // fleet_admin 只看自己的車行
      if (session.role === 'fleet_admin') {
        return NextResponse.json({ data: list.filter(c => c.id === session.org_id) })
      }
      return NextResponse.json({ data: list })
    }
    if (session.role === 'fleet_admin') {
      return NextResponse.json({ data: TRANSPORT_COMPANIES.filter(c => c.id === session.org_id) })
    }
    return NextResponse.json({ data: TRANSPORT_COMPANIES })
  } catch (e) {
    console.error('[GET /api/companies]', e)
    return NextResponse.json({ data: TRANSPORT_COMPANIES })
  }
}

export async function POST(req: NextRequest) {
  // 只有系統管理員可建立車行
  const { error } = await requireRole('system_admin')
  if (error) return error

  try {
    const body = await req.json()
    if (!body.name) return NextResponse.json({ error: '名稱為必填' }, { status: 400 })
    const co = useDB
      ? await dbCreateCompany(body)
      : { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    return NextResponse.json({ data: co }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/companies]', e)
    return NextResponse.json({ error: '建立失敗' }, { status: 500 })
  }
}
