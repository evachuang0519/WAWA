/**
 * GET /api/auth/line
 * Redirects the user to LINE Login authorization page.
 * Sets a short-lived CSRF state cookie.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export async function GET() {
  const channelId = process.env.LINE_CHANNEL_ID
  const redirectUri = process.env.LINE_REDIRECT_URI ?? 'http://localhost:3000/api/auth/line/callback'

  if (!channelId || channelId === 'your_line_channel_id') {
    return NextResponse.json(
      { error: 'LINE_CHANNEL_ID 尚未設定，請聯絡系統管理員' },
      { status: 503 }
    )
  }

  // CSRF state — stored in cookie, verified in callback
  const state = randomBytes(16).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set('ltc_line_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/',
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid',
  })

  return NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  )
}
