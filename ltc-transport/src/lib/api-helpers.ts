/**
 * 統一 API 回應格式 helpers
 * 所有路由使用 apiSuccess / apiError，確保回應結構一致
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import type { AuthUser } from '@/types'

// ── 回應格式 ─────────────────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export const API_ERRORS = {
  UNAUTHORIZED:  () => apiError('請先登入', 401),
  FORBIDDEN:     () => apiError('權限不足', 403),
  NOT_FOUND:     () => apiError('找不到資源', 404),
  BAD_REQUEST:   (msg?: string) => apiError(msg ?? '請求格式錯誤', 400),
  SERVER_ERROR:  (msg?: string) => apiError(msg ?? '伺服器錯誤', 500),
}

// ── 權限驗證 helper ───────────────────────────────────────────

type Role = AuthUser['role']

/**
 * 驗證 session 並確認角色，失敗時直接回傳錯誤 Response
 *
 * 用法：
 *   const { session, error } = await requireRole('fleet_admin', 'system_admin')
 *   if (error) return error
 */
export async function requireRole(...roles: Role[]): Promise<
  { session: AuthUser; error: null } |
  { session: null;    error: NextResponse }
> {
  const session = await getSession()
  if (!session) return { session: null, error: API_ERRORS.UNAUTHORIZED() }
  if (roles.length > 0 && !roles.includes(session.role)) {
    return { session: null, error: API_ERRORS.FORBIDDEN() }
  }
  return { session, error: null }
}

/**
 * 任何已登入角色均可
 */
export async function requireAuth(): Promise<
  { session: AuthUser; error: null } |
  { session: null;    error: NextResponse }
> {
  return requireRole()
}
