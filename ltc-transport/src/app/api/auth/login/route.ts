import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, setSession } from '@/lib/auth'
import type { AuthUser } from '@/types'

const useDB = !!process.env.DATABASE_URL

// In-memory fallback — IDs must match DB seed UUIDs
const DEMO_USERS = [
  { id: '00000000-0000-0000-0000-000000000001', name: '系統管理員', email: 'admin@ltc.tw', password: 'admin1234', role: 'system_admin' as const, org_id: undefined, org_type: undefined },
  { id: '00000000-0000-0000-0000-000000000002', name: '照橙管理員', email: 'org@ltc.tw', password: 'org12345', role: 'org_admin' as const, org_id: '10000000-0000-0000-0000-000000000001', org_type: 'care_unit' as const },
  { id: '00000000-0000-0000-0000-000000000003', name: '安心車行', email: 'fleet@ltc.tw', password: 'fleet123', role: 'fleet_admin' as const, org_id: '20000000-0000-0000-0000-000000000001', org_type: 'transport_company' as const },
  { id: '00000000-0000-0000-0000-000000000004', name: '張志明', email: 'driver@ltc.tw', password: 'driver123', role: 'driver' as const, org_id: '20000000-0000-0000-0000-000000000001', org_type: 'transport_company' as const },
]

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    let authUser: AuthUser | null = null

    if (useDB) {
      try {
        const { dbFindUserByEmail, dbUpdateUserLastLogin } = await import('@/lib/queries/users')
        const dbUser = await dbFindUserByEmail(email)
        if (dbUser && dbUser.status === 'active') {
          const ok = await verifyPassword(password, dbUser.password_hash)
          if (ok) {
            authUser = {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role,
              org_id: dbUser.org_id,
              org_type: dbUser.org_type,
            }
            await dbUpdateUserLastLogin(dbUser.id).catch(() => {})
          }
        }
      } catch (e) {
        console.error('[login] DB error, falling back to demo users:', e)
      }
    }

    // Fallback to in-memory demo users
    if (!authUser) {
      const demo = DEMO_USERS.find(u => u.email === email)
      if (demo && demo.password === password) {
        authUser = {
          id: demo.id,
          name: demo.name,
          email: demo.email,
          role: demo.role,
          org_id: demo.org_id,
          org_type: demo.org_type,
        }
      }
    }

    if (!authUser) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
    }

    await setSession(authUser)
    return NextResponse.json({ data: authUser })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
