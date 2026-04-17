/**
 * GET /api/auth/line/callback
 * Handles the LINE OAuth callback:
 *   - Verifies state (CSRF)
 *   - Exchanges code for access token
 *   - Fetches LINE profile
 *   - If user exists → set session → redirect to /line/tasks
 *   - If new user → set temp cookie → redirect to /line/register
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose'
import { setSession } from '@/lib/auth'
import { dbFindUserByLineId, dbUpdateUserLastLogin } from '@/lib/queries/users'
import type { AuthUser } from '@/types'

const TEMP_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-please-change-in-production-32c'
)

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

async function exchangeToken(code: string): Promise<string | null> {
  const res = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.LINE_REDIRECT_URI ?? 'http://localhost:3000/api/auth/line/callback',
      client_id: process.env.LINE_CHANNEL_ID ?? '',
      client_secret: process.env.LINE_CHANNEL_SECRET ?? '',
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

async function fetchLineProfile(accessToken: string): Promise<LineProfile | null> {
  const res = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const { searchParams } = req.nextUrl

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // User denied LINE Login
  if (error) {
    return NextResponse.redirect(new URL('/line/login?error=line_denied', req.url))
  }

  // CSRF check
  const storedState = cookieStore.get('ltc_line_state')?.value
  cookieStore.delete('ltc_line_state')

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL('/line/login?error=invalid_state', req.url))
  }

  // Exchange code for token
  const accessToken = await exchangeToken(code)
  if (!accessToken) {
    return NextResponse.redirect(new URL('/line/login?error=token_failed', req.url))
  }

  // Get LINE profile
  const profile = await fetchLineProfile(accessToken)
  if (!profile) {
    return NextResponse.redirect(new URL('/line/login?error=profile_failed', req.url))
  }

  // Check if LINE user is already registered
  const existingUser = await dbFindUserByLineId(profile.userId).catch(() => null)

  if (existingUser) {
    // Known user — issue session and go to tasks
    await dbUpdateUserLastLogin(existingUser.id).catch(() => {})
    const authUser: AuthUser = {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      org_id: existingUser.org_id,
      org_type: existingUser.org_type,
    }
    await setSession(authUser)
    return NextResponse.redirect(new URL('/line/tasks', req.url))
  }

  // New user — store LINE profile in a short-lived signed cookie, redirect to register
  const tempToken = await new SignJWT({
    line_user_id: profile.userId,
    display_name: profile.displayName,
    picture_url: profile.pictureUrl ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(TEMP_SECRET)

  cookieStore.set('ltc_line_temp', tempToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 900, // 15 minutes
    path: '/',
  })

  // Pass display name as query param for pre-filling the form (non-sensitive)
  const registerUrl = new URL('/line/register', req.url)
  registerUrl.searchParams.set('name', profile.displayName)
  if (profile.pictureUrl) registerUrl.searchParams.set('pic', profile.pictureUrl)

  return NextResponse.redirect(registerUrl)
}
