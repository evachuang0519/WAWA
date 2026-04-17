import sql from '@/lib/pg'
import type { AppSettings, SyncTableConfig } from '@/app/api/settings/route'

// ── DB read ──────────────────────────────────────────────────

export async function dbGetSettings(): Promise<Partial<AppSettings>> {
  const rows = await sql`SELECT key, value FROM system_settings`
  const map: Record<string, unknown> = {}
  for (const row of rows) {
    map[String(row.key)] = row.value
  }

  const result: Partial<AppSettings> = {}
  if (map.google_maps) result.google_maps = map.google_maps as AppSettings['google_maps']
  if (map.appsheet) result.appsheet = map.appsheet as AppSettings['appsheet']
  if (map.sync_config) {
    const cfg = map.sync_config as { auto_sync_enabled?: boolean; sync_tables?: SyncTableConfig[]; updated_at?: string; updated_by?: string }
    result.auto_sync_enabled = cfg.auto_sync_enabled
    result.sync_tables = cfg.sync_tables
    result.updated_at = cfg.updated_at ?? null
    result.updated_by = cfg.updated_by ?? null
  }
  return result
}

// ── DB write (upsert per key) ────────────────────────────────

export async function dbSaveSettingsKey(
  key: string,
  value: Record<string, unknown>,
  updatedBy: string,
): Promise<void> {
  await sql`
    INSERT INTO system_settings (key, value, updated_at, updated_by)
    VALUES (${key}, ${sql.json(value as Parameters<typeof sql.json>[0])}, NOW(), ${updatedBy})
    ON CONFLICT (key) DO UPDATE
      SET value      = EXCLUDED.value,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
  `
}
