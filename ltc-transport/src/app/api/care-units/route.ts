import { NextRequest, NextResponse } from 'next/server'
import { dbListCareUnits, dbCreateCareUnit } from '@/lib/queries/care_units'
import { requireRole, API_ERRORS } from '@/lib/api-helpers'
import { CARE_UNITS } from '@/lib/db'

const useDB = !!process.env.DATABASE_URL

export async function GET() {
  // 所有已登入角色皆可讀取機構清單（建立訂單時選擇機構需要）
  const { session, error } = await requireRole('system_admin', 'org_admin', 'fleet_admin', 'driver')
  if (error) return error

  try {
    if (useDB) {
      const list = await dbListCareUnits()
      // org_admin 只看到自己的機構
      if (session.role === 'org_admin') {
        return NextResponse.json({ data: list.filter(c => c.id === session.org_id) })
      }
      return NextResponse.json({ data: list })
    }
    if (session.role === 'org_admin') {
      return NextResponse.json({ data: CARE_UNITS.filter(c => c.id === session.org_id) })
    }
    return NextResponse.json({ data: CARE_UNITS })
  } catch (e) {
    console.error('[GET /api/care-units]', e)
    return NextResponse.json({ data: CARE_UNITS })
  }
}

export async function POST(req: NextRequest) {
  // 只有系統管理員可建立機構
  const { error } = await requireRole('system_admin')
  if (error) return error

  try {
    const body = await req.json()
    if (!body.name) return NextResponse.json({ error: '名稱為必填' }, { status: 400 })
    const cu = useDB
      ? await dbCreateCareUnit(body)
      : { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    return NextResponse.json({ data: cu }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/care-units]', e)
    return NextResponse.json({ error: '建立失敗' }, { status: 500 })
  }
}
