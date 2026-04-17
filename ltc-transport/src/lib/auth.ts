import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import type { AuthUser } from '@/types'

const DEFAULT_SECRET = 'ltc-transport-jwt-secret-2026-min-32-chars'
const rawSecret = process.env.JWT_SECRET || DEFAULT_SECRET

// ⚠️ 安全警告：使用預設 JWT_SECRET（只警告一次）
let _jwtSecretWarned = false
if (!_jwtSecretWarned) {
  _jwtSecretWarned = true
  if (rawSecret === DEFAULT_SECRET || rawSecret.length < 32) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '[SECURITY] JWT_SECRET 使用預設值或長度不足 32 字元！' +
      '請在 .env.local 中設定隨機強密鑰後重啟伺服器。',
    )
  }
}

const SECRET = new TextEncoder().encode(rawSecret)
const COOKIE_NAME = 'ltc_session'

// ── JWT ──────────────────────────────────────────────────────
export async function signToken(payload: AuthUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as AuthUser
  } catch {
    return null
  }
}

// ── Cookie helpers ────────────────────────────────────────────
export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function setSession(user: AuthUser): Promise<string> {
  const token = await signToken(user)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })
  return token
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ── Password ─────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── Role helpers ──────────────────────────────────────────────
export function isAdmin(role?: string): boolean {
  return role === 'system_admin'
}

export function isOrgAdmin(role?: string): boolean {
  return role === 'org_admin'
}

export function isFleetAdmin(role?: string): boolean {
  return role === 'fleet_admin'
}

export function isDriver(role?: string): boolean {
  return role === 'driver'
}

export function canManageBookings(role?: string): boolean {
  return ['system_admin', 'org_admin'].includes(role || '')
}

export function canAssignTasks(role?: string): boolean {
  return ['system_admin', 'fleet_admin'].includes(role || '')
}

export function canViewAll(role?: string): boolean {
  return role === 'system_admin'
}
