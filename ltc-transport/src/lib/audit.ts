/**
 * 稽核日誌 — 寫入 system_logs 資料表
 * 不阻斷主流程：失敗時僅 console.warn，不拋出例外
 */
import type { AuthUser } from '@/types'

const useDB = !!process.env.DATABASE_URL

export async function writeLog(
  user: Pick<AuthUser, 'id' | 'name'> | null,
  action: string,
  target: string,
  targetId?: string,
  detail?: Record<string, unknown>,
) {
  if (!useDB) {
    // 記憶體模式：僅印出到 console
    console.info(`[AUDIT] ${user?.name ?? 'system'} | ${action} | ${target}${targetId ? ` (${targetId})` : ''}`, detail ?? '')
    return
  }
  try {
    const { default: sql } = await import('@/lib/pg')
    await sql`
      INSERT INTO system_logs (user_id, action, target, target_id, detail)
      VALUES (
        ${user?.id ?? null},
        ${action},
        ${target},
        ${targetId ?? null},
        ${sql.json((detail ?? {}) as Parameters<typeof sql.json>[0])}
      )
    `
  } catch (e) {
    console.warn('[audit] writeLog failed:', e)
  }
}

// ── 預定義 action 常數 ────────────────────────────────────────
export const AUDIT = {
  BOOKING_CREATE:   'booking.create',
  BOOKING_UPDATE:   'booking.update',
  BOOKING_CANCEL:   'booking.cancel',
  ASSIGN_CREATE:    'assign.create',
  ASSIGN_UPDATE:    'assign.update',
  DRIVER_CREATE:    'driver.create',
  DRIVER_UPDATE:    'driver.update',
  DRIVER_DELETE:    'driver.delete',
  VEHICLE_CREATE:   'vehicle.create',
  VEHICLE_UPDATE:   'vehicle.update',
  VEHICLE_DELETE:   'vehicle.delete',
  PASSENGER_CREATE: 'passenger.create',
  PASSENGER_UPDATE: 'passenger.update',
  PASSENGER_DELETE: 'passenger.delete',
  SERVICE_SUBMIT:   'service.submit',
  SETTINGS_UPDATE:  'settings.update',
  USER_LOGIN:       'user.login',
  USER_CREATE:      'user.create',
  USER_DELETE:      'user.delete',
} as const
