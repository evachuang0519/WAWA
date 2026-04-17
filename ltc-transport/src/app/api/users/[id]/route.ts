import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/pg'
import { hashPassword } from '@/lib/auth'
import { requireRole } from '@/lib/api-helpers'

const useDB = !!process.env.DATABASE_URL

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // 修改使用者僅系統管理員可執行
  const { error } = await requireRole('system_admin')
  if (error) return error

  const { id } = await ctx.params
  try {
    const body = await req.json()
    const { name, email, role, org_id, org_type, status, password } = body
    if (!useDB) return NextResponse.json({ error: '需要資料庫連線' }, { status: 503 })

    if (password) {
      const hash = await hashPassword(password)
      const rows = await sql`
        UPDATE users SET
          name       = COALESCE(${name ?? null}, name),
          email      = COALESCE(${email ?? null}, email),
          role       = COALESCE(${role ?? null}::user_role, role),
          org_id     = COALESCE(${org_id ?? null}, org_id),
          org_type   = COALESCE(${org_type ?? null}, org_type),
          status     = COALESCE(${status ?? null}::user_status, status),
          password_hash = ${hash},
          updated_at = NOW()
        WHERE id = ${id} RETURNING id, name, email, role, org_id, org_type, status
      `
      return rows[0] ? NextResponse.json({ data: rows[0] }) : NextResponse.json({ error: '找不到' }, { status: 404 })
    }

    const rows = await sql`
      UPDATE users SET
        name     = COALESCE(${name ?? null}, name),
        email    = COALESCE(${email ?? null}, email),
        role     = COALESCE(${role ?? null}::user_role, role),
        org_id   = COALESCE(${org_id ?? null}, org_id),
        org_type = COALESCE(${org_type ?? null}, org_type),
        status   = COALESCE(${status ?? null}::user_status, status),
        updated_at = NOW()
      WHERE id = ${id} RETURNING id, name, email, role, org_id, org_type, status
    `
    return rows[0] ? NextResponse.json({ data: rows[0] }) : NextResponse.json({ error: '找不到' }, { status: 404 })
  } catch (e) {
    console.error('[PATCH /api/users/:id]', e)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}
