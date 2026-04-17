/**
 * GET /api/driver/me
 * Returns the driver record linked to the current session user.
 * Used by LINE WebView pages to replace hardcoded MY_DRIVER_ID.
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dbFindDriverByUserId } from '@/lib/queries/drivers'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  try {
    const driver = await dbFindDriverByUserId(session.id)
    if (!driver) {
      return NextResponse.json({ error: '找不到對應的駕駛資料' }, { status: 404 })
    }
    return NextResponse.json({ data: { ...driver, user: session } })
  } catch (e) {
    console.error('[GET /api/driver/me]', e)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
