import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dbGetSettings, dbSaveSettingsKey } from '@/lib/queries/settings'
import { writeLog, AUDIT } from '@/lib/audit'

const useDB = !!process.env.DATABASE_URL

export interface SyncTableConfig {
  id: string
  appsheet_table: string
  db_table: string
  description: string
  enabled: boolean
  interval_minutes: number
  last_sync_at: string | null
  last_sync_status: 'success' | 'error' | 'never'
  last_sync_count: number | null
  last_sync_error: string | null
}

export interface AppSettings {
  google_maps: {
    api_key: string
    map_id: string
    default_lat: string
    default_lng: string
    default_zoom: string
  }
  appsheet: {
    app_id: string
    access_key: string
    spreadsheet_id: string
  }
  auto_sync_enabled: boolean
  sync_tables: SyncTableConfig[]
  updated_at: string | null
  updated_by: string | null
}

declare global {
  // eslint-disable-next-line no-var
  var __appSettings: AppSettings | undefined
}

const DEFAULT_SETTINGS: AppSettings = {
  google_maps: {
    api_key: '',
    map_id: '',
    default_lat: '24.1477',
    default_lng: '120.6736',
    default_zoom: '13',
  },
  appsheet: {
    app_id: '',
    access_key: '',
    spreadsheet_id: '',
  },
  auto_sync_enabled: false,
  sync_tables: [
    { id: 'passengers',      appsheet_table: '日照名單',   db_table: 'passengers',      description: '服務個案（乘客）資料',          enabled: true,  interval_minutes: 0, last_sync_at: null, last_sync_status: 'never', last_sync_count: null, last_sync_error: null },
    { id: 'booking_records', appsheet_table: '日照班表',   db_table: 'booking_records', description: '訂車紀錄 / 排班資料',           enabled: true,  interval_minutes: 0, last_sync_at: null, last_sync_status: 'never', last_sync_count: null, last_sync_error: null },
    { id: 'drivers',         appsheet_table: '司機',       db_table: 'drivers',         description: '駕駛人員資料',                  enabled: true,  interval_minutes: 0, last_sync_at: null, last_sync_status: 'never', last_sync_count: null, last_sync_error: null },
    { id: 'service_records', appsheet_table: '服務明細表', db_table: 'service_records', description: '完成服務明細（含 GPS、時間）', enabled: false, interval_minutes: 0, last_sync_at: null, last_sync_status: 'never', last_sync_count: null, last_sync_error: null },
  ],
  updated_at: null,
  updated_by: null,
}

// ── 記憶體 fallback ──────────────────────────────────────────
function getMemSettings(): AppSettings {
  if (!global.__appSettings) {
    global.__appSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  }
  return global.__appSettings!
}

// ── DB + fallback 讀取 ───────────────────────────────────────
async function getSettings(): Promise<AppSettings> {
  if (!useDB) return getMemSettings()
  try {
    const partial = await dbGetSettings()
    const base: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
    if (partial.google_maps) Object.assign(base.google_maps, partial.google_maps)
    if (partial.appsheet)    Object.assign(base.appsheet, partial.appsheet)
    if (typeof partial.auto_sync_enabled === 'boolean') base.auto_sync_enabled = partial.auto_sync_enabled
    if (partial.sync_tables?.length) {
      partial.sync_tables.forEach(pt => {
        const tbl = base.sync_tables.find(t => t.id === pt.id)
        if (tbl) Object.assign(tbl, pt)
      })
    }
    if (partial.updated_at)  base.updated_at = partial.updated_at
    if (partial.updated_by)  base.updated_by = partial.updated_by
    return base
  } catch (e) {
    console.error('[settings] DB read failed, using memory:', e)
    return getMemSettings()
  }
}

// ── DB + fallback 寫入 ───────────────────────────────────────
async function saveSettings(settings: AppSettings, updatedBy: string): Promise<void> {
  if (!useDB) { global.__appSettings = settings; return }
  try {
    await dbSaveSettingsKey('google_maps', settings.google_maps as unknown as Record<string, unknown>, updatedBy)
    await dbSaveSettingsKey('appsheet',    settings.appsheet    as unknown as Record<string, unknown>, updatedBy)
    await dbSaveSettingsKey('sync_config', {
      auto_sync_enabled: settings.auto_sync_enabled,
      sync_tables: settings.sync_tables,
      updated_at: settings.updated_at,
      updated_by: settings.updated_by,
    }, updatedBy)
  } catch (e) {
    console.error('[settings] DB write failed, saving to memory:', e)
    global.__appSettings = settings
  }
}

function isSystemAdmin(role: string) { return role === 'system_admin' }

// ── GET ───────────────────────────────────────────────────────
export async function GET() {
  const session = await getSession()
  if (!session || !isSystemAdmin(session.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }
  const data = await getSettings()
  return NextResponse.json({ data })
}

// ── PATCH ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || !isSystemAdmin(session.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const current = await getSettings()

    if (body.google_maps) Object.assign(current.google_maps, body.google_maps)
    if (body.appsheet)    Object.assign(current.appsheet, body.appsheet)
    if (typeof body.auto_sync_enabled === 'boolean') current.auto_sync_enabled = body.auto_sync_enabled
    if (Array.isArray(body.sync_tables)) {
      body.sync_tables.forEach((patch: Partial<SyncTableConfig> & { id: string }) => {
        const tbl = current.sync_tables.find(t => t.id === patch.id)
        if (tbl) Object.assign(tbl, patch)
      })
    }
    current.updated_at = new Date().toISOString()
    current.updated_by = session.name

    await saveSettings(current, session.name)
    await writeLog(session, AUDIT.SETTINGS_UPDATE, 'system_settings', undefined, { keys: Object.keys(body) })
    return NextResponse.json({ data: current })
  } catch {
    return NextResponse.json({ error: '格式錯誤' }, { status: 400 })
  }
}
