import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import type { SyncTableConfig, AppSettings } from '../route'

declare global {
  // eslint-disable-next-line no-var
  var __appSettings: AppSettings | undefined
}

const useDB = !!process.env.DATABASE_URL

function isSystemAdmin(role: string) {
  return role === 'system_admin'
}

// ── DB → AppSheet 欄位對應 ─────────────────────────────────────
const TABLE_QUERY: Record<string, string> = {
  passengers:      'SELECT * FROM passengers WHERE status != \'inactive\' ORDER BY created_at DESC',
  booking_records: 'SELECT * FROM booking_records ORDER BY service_date DESC, service_time NULLS LAST LIMIT 500',
  drivers:         'SELECT id, name, phone, license_number, license_class, license_expiry, health_cert_expiry, status FROM drivers ORDER BY name',
  service_records: 'SELECT * FROM service_records ORDER BY service_date DESC, created_at DESC LIMIT 500',
}

// AppSheet REST API endpoint for adding/editing rows
// POST https://api.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action
async function pushToAppSheet(
  appId: string,
  accessKey: string,
  tableName: string,
  rows: Record<string, unknown>[],
): Promise<{ pushed: number }> {
  if (!appId || !accessKey) throw new Error('AppSheet App ID 與 Access Key 尚未設定')
  if (rows.length === 0) return { pushed: 0 }

  const url = `https://api.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(tableName)}/Action`

  // Convert ISO timestamps to the format AppSheet / Google Sheets expects (MM/DD/YYYY HH:MM:SS)
  function formatForSheets(val: unknown): string {
    if (val === null || val === undefined) return ''
    if (val instanceof Date) return val.toLocaleString('en-US')
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
      return new Date(val).toLocaleString('en-US')
    }
    return String(val)
  }

  // AppSheet Add action: creates rows that don't exist (matched by key), updates rows that do
  const body = {
    Action: 'Add',
    Properties: { Locale: 'zh-TW', Timezone: 'Asia/Taipei' },
    Rows: rows.map(row =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, formatForSheets(v)])
      )
    ),
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ApplicationAccessKey': accessKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AppSheet API 錯誤 ${res.status}: ${text.slice(0, 200)}`)
  }

  return { pushed: rows.length }
}

// ── Fetch rows from local DB ──────────────────────────────────
async function fetchLocalRows(tableId: string): Promise<Record<string, unknown>[]> {
  if (!useDB) {
    // Fallback: return mock data counts
    const { PASSENGERS, DRIVERS, BOOKING_RECORDS, SERVICE_RECORDS } = await import('@/lib/db')
    const mockMap: Record<string, unknown[]> = {
      passengers:      PASSENGERS,
      drivers:         DRIVERS,
      booking_records: BOOKING_RECORDS,
      service_records: SERVICE_RECORDS,
    }
    return (mockMap[tableId] ?? []) as Record<string, unknown>[]
  }

  const sql = (await import('@/lib/pg')).default
  const query = TABLE_QUERY[tableId]
  if (!query) throw new Error(`未知資料表 ID: ${tableId}`)
  return await sql.unsafe(query) as Record<string, unknown>[]
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !isSystemAdmin(session.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const settings = global.__appSettings
  if (!settings) {
    return NextResponse.json({ error: '設定尚未載入，請先造訪設定頁面' }, { status: 400 })
  }

  let body: { table_ids?: string[] } = {}
  try { body = await req.json() } catch { /* empty body is fine */ }

  const targets: SyncTableConfig[] = settings.sync_tables.filter(t =>
    t.enabled && (body.table_ids == null || body.table_ids.includes(t.id))
  )

  if (targets.length === 0) {
    return NextResponse.json({ error: '沒有可同步的資料表（請確認已啟用）' }, { status: 400 })
  }

  const results: Record<string, {
    status: 'success' | 'error' | 'skipped'
    count?: number
    pushed?: number
    error?: string
  }> = {}

  for (const tbl of targets) {
    try {
      // 1. Fetch rows from local DB
      const rows = await fetchLocalRows(tbl.id)

      // 2. Push to AppSheet
      const { pushed } = await pushToAppSheet(
        settings.appsheet.app_id,
        settings.appsheet.access_key,
        tbl.appsheet_table,
        rows,
      )

      // 3. Update sync metadata
      tbl.last_sync_at = new Date().toISOString()
      tbl.last_sync_status = 'success'
      tbl.last_sync_count = pushed
      tbl.last_sync_error = null

      results[tbl.id] = { status: 'success', count: rows.length, pushed }
    } catch (e) {
      const msg = (e as Error).message
      tbl.last_sync_at = new Date().toISOString()
      tbl.last_sync_status = 'error'
      tbl.last_sync_error = msg
      results[tbl.id] = { status: 'error', error: msg }
    }
  }

  return NextResponse.json({ data: { results, sync_tables: settings.sync_tables } })
}
