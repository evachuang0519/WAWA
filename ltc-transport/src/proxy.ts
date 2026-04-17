import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Dashboard public paths (no auth required)
const DASHBOARD_PUBLIC = ['/login', '/api/auth/login', '/api/auth/line']

// LINE paths that are public (no session required)
const LINE_PUBLIC_PREFIXES = ['/line/login', '/line/register', '/api/auth/line']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow static files and Next internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // ── LINE WebView routes ──────────────────────────────────────
  if (pathname.startsWith('/line') || pathname.startsWith('/api/auth/line')) {
    const isPublic = LINE_PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
    if (isPublic) return NextResponse.next()

    const token = req.cookies.get('ltc_session')?.value
    if (!token) return NextResponse.redirect(new URL('/line/login', req.url))
    const user = await verifyToken(token)
    if (!user) return NextResponse.redirect(new URL('/line/login', req.url))
    return NextResponse.next()
  }

  // ── Dashboard routes ─────────────────────────────────────────
  if (DASHBOARD_PUBLIC.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get('ltc_session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const user = await verifyToken(token)
  if (!user) {
    const resp = NextResponse.redirect(new URL('/login', req.url))
    resp.cookies.delete('ltc_session')
    return resp
  }

  // Role-based route guards
  if (pathname.startsWith('/admin') && user.role !== 'system_admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
