import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/pg'
import { dbCreateUser } from '@/lib/queries/users'
import { requireRole } from '@/lib/api-helpers'
import type { UserRole } from '@/types'

const useDB = !!process.env.DATABASE_URL

export async function GET(req: NextRequest) {
  // 使用者清單僅系統管理員可存取
  const { error } = await requireRole('system_admin')
  if (error) return error

  const role = req.nextUrl.searchParams.get('role') ?? undefined
  try {
    if (!useDB) return NextResponse.json({ data: [] })
    const rows = role
      ? await sql`SELECT id, name, email, role, org_id, org_type, status, avatar_url, last_login, created_at FROM users WHERE role = ${role} ORDER BY name`
      : await sql`SELECT id, name, email, role, org_id, org_type, status, avatar_url, last_login, created_at FROM users ORDER BY name`
    return NextResponse.json({ data: rows })
  } catch (e) {
    console.error('[GET /api/users]', e)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(req: NextRequest) {
  // 建立使用者僅系統管理員可執行
  const { error } = await requireRole('system_admin')
  if (error) return error

  try {
    const body = await req.json()
    const { name, email, password, role, org_id, org_type } = body
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: '姓名、Email、密碼、角色為必填' }, { status: 400 })
    }
    const user = await dbCreateUser({ name, email, password, role: role as UserRole, org_id, org_type, status: 'active' })
    return NextResponse.json({ data: user }, { status: 201 })
  } catch (e: unknown) {
    console.error('[POST /api/users]', e)
    if (e instanceof Error && e.message.includes('unique')) {
      return NextResponse.json({ error: '此 Email 已被使用' }, { status: 409 })
    }
    return NextResponse.json({ error: '建立失敗' }, { status: 500 })
  }
}
