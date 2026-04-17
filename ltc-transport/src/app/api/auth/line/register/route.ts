/**
 * POST /api/auth/line/register
 * Completes LINE-based driver registration.
 *   - Reads ltc_line_temp cookie to verify LINE identity
 *   - Creates user + driver records
 *   - Issues session
 *   - Returns { data: authUser }
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { setSession } from '@/lib/auth'
import { dbCreateUser } from '@/lib/queries/users'
import { dbCreateDriver } from '@/lib/queries/drivers'
import type { AuthUser } from '@/types'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-please-change-in-production-32c'
)

interface RegisterBody {
  name: string
  phone: string
  license_number: string
  license_class: string
  company_id: string
  license_expiry?: string
  health_cert_expiry?: string
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()

  // Verify LINE temp token
  const tempToken = cookieStore.get('ltc_line_temp')?.value
  if (!tempToken) {
    return NextResponse.json({ error: 'LINE 驗證已過期，請重新登入' }, { status: 401 })
  }

  let linePayload: { line_user_id: string; display_name: string; picture_url?: string }
  try {
    const { payload } = await jwtVerify(tempToken, SECRET)
    linePayload = payload as typeof linePayload
  } catch {
    return NextResponse.json({ error: 'LINE 驗證已過期，請重新登入' }, { status: 401 })
  }

  const body: RegisterBody = await req.json()
  const { name, phone, license_number, license_class, company_id, license_expiry, health_cert_expiry } = body

  if (!name || !phone || !license_number || !license_class || !company_id) {
    return NextResponse.json({ error: '請填寫所有必填欄位' }, { status: 400 })
  }

  try {
    // Generate a unique pseudo-email from LINE user ID (no real email needed for LINE-only users)
    const pseudoEmail = `line_${linePayload.line_user_id}@ltc-line.local`

    // Create user account
    const user = await dbCreateUser({
      name,
      email: pseudoEmail,
      role: 'driver',
      line_user_id: linePayload.line_user_id,
      line_picture_url: linePayload.picture_url,
      status: 'active',
    })

    // Create linked driver record
    const driver = await dbCreateDriver({
      company_id,
      user_id: user.id,
      name,
      phone,
      license_number,
      license_class,
      license_expiry: license_expiry || undefined,
      health_cert_expiry: health_cert_expiry || undefined,
      status: 'active',
    })

    // Clear temp cookie
    cookieStore.delete('ltc_line_temp')

    // Issue session with the driver's company as org
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'driver',
      org_id: driver.company_id,
      org_type: 'transport_company',
    }
    await setSession(authUser)

    return NextResponse.json({ data: authUser }, { status: 201 })
  } catch (e) {
    console.error('[LINE register]', e)
    // Check for duplicate LINE user (race condition)
    if (e instanceof Error && e.message.includes('unique')) {
      return NextResponse.json({ error: '此 LINE 帳號已註冊' }, { status: 409 })
    }
    return NextResponse.json({ error: '註冊失敗，請稍後再試' }, { status: 500 })
  }
}
