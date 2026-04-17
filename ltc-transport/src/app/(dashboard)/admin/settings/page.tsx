'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  Map, KeyRound, Eye, EyeOff, Save, RefreshCw, CheckCircle2,
  AlertCircle, Clock, Database, Zap, ChevronDown, ChevronUp,
  TableProperties, AlertTriangle, Timer, Play, Square,
} from 'lucide-react'
import type { AppSettings, SyncTableConfig } from '@/app/api/settings/route'

function maskSecret(val: string) {
  if (!val) return ''
  if (val.length <= 8) return '•'.repeat(val.length)
  return val.slice(0, 4) + '•'.repeat(val.length - 8) + val.slice(-4)
}

function formatTime(iso: string | null) {
  if (!iso) return '從未同步'
  return new Date(iso).toLocaleString('zh-TW', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function nextSyncIn(lastSyncAt: string | null, intervalMinutes: number): string {
  if (!lastSyncAt || intervalMinutes <= 0) return ''
  const next = new Date(lastSyncAt).getTime() + intervalMinutes * 60 * 1000
  const remaining = Math.max(0, next - Date.now())
  if (remaining === 0) return '即將同步…'
  const m = Math.floor(remaining / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  return m > 0 ? `${m} 分 ${s} 秒後` : `${s} 秒後`
}

function isDue(lastSyncAt: string | null, intervalMinutes: number): boolean {
  if (!lastSyncAt || intervalMinutes <= 0) return false
  const next = new Date(lastSyncAt).getTime() + intervalMinutes * 60 * 1000
  return Date.now() >= next
}

const PRESET_INTERVALS = [
  { label: '僅手動', value: 0 },
  { label: '每 5 分鐘', value: 5 },
  { label: '每 15 分鐘', value: 15 },
  { label: '每 30 分鐘', value: 30 },
  { label: '每 1 小時', value: 60 },
  { label: '每 2 小時', value: 120 },
  { label: '每 6 小時', value: 360 },
  { label: '自訂…', value: -1 },
]

const STATUS_MAP = {
  never:   { label: '從未同步', color: 'text-gray-400',  bg: 'bg-gray-100' },
  success: { label: '同步成功', color: 'text-green-700', bg: 'bg-green-100' },
  error:   { label: '同步失敗', color: 'text-red-700',   bg: 'bg-red-100'  },
}

const DB_TABLE_LABELS: Record<string, string> = {
  passengers:      'passengers（個案）',
  booking_records: 'booking_records（訂車）',
  drivers:         'drivers（駕駛）',
  service_records: 'service_records（服務明細）',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [openSection, setOpenSection] = useState<'maps' | 'appsheet' | 'sync' | null>('sync')
  const [customIntervals, setCustomIntervals] = useState<Record<string, boolean>>({})
  const [tick, setTick] = useState(0)           // forces countdown re-render every second

  // Keep a ref to latest settings for use inside interval callbacks
  const settingsRef = useRef<AppSettings | null>(null)
  settingsRef.current = settings

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.status === 403) { showToast('此頁面僅系統管理者可存取', false); setLoading(false); return }
      const json = await res.json()
      setSettings(json.data)
    } catch { showToast('載入失敗', false) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── 1-second ticker for countdown display ────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Auto-sync scheduler ───────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const s = settingsRef.current
      if (!s?.auto_sync_enabled) return
      const due = s.sync_tables.filter(t =>
        t.enabled && t.interval_minutes > 0 && isDue(t.last_sync_at, t.interval_minutes)
      )
      if (due.length > 0) {
        // trigger sync silently (fire-and-forget; UI updates via state after response)
        fetch('/api/settings/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table_ids: due.map(t => t.id) }),
        })
          .then(r => r.json())
          .then(json => {
            if (json.data?.sync_tables) {
              setSettings(prev => prev ? { ...prev, sync_tables: json.data.sync_tables } : prev)
            }
          })
          .catch(() => {})
      }
    }, 10_000)   // check every 10 s
    return () => clearInterval(id)
  }, [])

  // ── Sync handler ─────────────────────────────────────────────
  async function handleSync(tableIds: string[] | null) {
    setSyncing(tableIds === null ? 'all' : tableIds[0])
    try {
      const res = await fetch('/api/settings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_ids: tableIds }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSettings(prev => prev ? { ...prev, sync_tables: json.data.sync_tables } : prev)
      const results = json.data.results as Record<string, { status: string; count?: number; error?: string }>
      const failed = Object.entries(results).filter(([, v]) => v.status === 'error')
      if (failed.length > 0) showToast(`${failed.length} 張資料表同步失敗`, false)
      else {
        const total = Object.values(results).reduce((s, v) => s + (v.count ?? 0), 0)
        showToast(`同步完成，共推送 ${total} 筆資料至 AppSheet`, true)
      }
    } catch (e) { showToast((e as Error).message || '同步失敗', false) }
    setSyncing(null)
  }

  // ── Save ─────────────────────────────────────────────────────
  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_maps: settings.google_maps,
          appsheet: settings.appsheet,
          auto_sync_enabled: settings.auto_sync_enabled,
          sync_tables: settings.sync_tables.map(t => ({
            id: t.id,
            enabled: t.enabled,
            interval_minutes: t.interval_minutes,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSettings(json.data)
      showToast('設定已儲存', true)
    } catch (e) { showToast((e as Error).message || '儲存失敗', false) }
    setSaving(false)
  }

  // ── Helpers ──────────────────────────────────────────────────
  const toggleShow = (key: string) => setShowKeys(p => ({ ...p, [key]: !p[key] }))
  const toggleSection = (s: 'maps' | 'appsheet' | 'sync') =>
    setOpenSection(prev => prev === s ? null : s)
  const setMaps = (field: string, val: string) =>
    setSettings(p => p ? { ...p, google_maps: { ...p.google_maps, [field]: val } } : p)
  const setAppSheet = (field: string, val: string) =>
    setSettings(p => p ? { ...p, appsheet: { ...p.appsheet, [field]: val } } : p)
  const toggleTable = (id: string) =>
    setSettings(p => p ? {
      ...p,
      sync_tables: p.sync_tables.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t),
    } : p)
  const setTableInterval = (id: string, minutes: number) =>
    setSettings(p => p ? {
      ...p,
      sync_tables: p.sync_tables.map(t => t.id === id ? { ...t, interval_minutes: minutes } : t),
    } : p)

  // ── Loading / error states ────────────────────────────────────
  if (loading) {
    return (
      <div>
        <TopBar title="系統設定" subtitle="僅系統管理者可存取" />
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={24} className="animate-spin text-green-600" />
        </div>
      </div>
    )
  }
  if (!settings) {
    return (
      <div>
        <TopBar title="系統設定" subtitle="僅系統管理者可存取" />
        <div className="p-6 max-w-xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3 text-red-700">
            <AlertTriangle size={20} />
            <p className="text-sm font-medium">此頁面僅供系統管理者存取</p>
          </div>
        </div>
      </div>
    )
  }

  const enabledCount = settings.sync_tables.filter(t => t.enabled).length
  const scheduledCount = settings.sync_tables.filter(t => t.enabled && t.interval_minutes > 0).length

  return (
    <div>
      <TopBar title="系統設定" subtitle="僅系統管理者可存取此頁面" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="p-6 max-w-3xl mx-auto space-y-4">

        {settings.updated_at && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Clock size={11} />
            最後儲存：{formatTime(settings.updated_at)}
            {settings.updated_by && <span>by {settings.updated_by}</span>}
          </p>
        )}

        {/* ── Google Maps ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button type="button" onClick={() => toggleSection('maps')}
            className="w-full flex items-center gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Map size={16} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">Google Maps 設定</p>
              <p className="text-xs text-gray-400 mt-0.5">API 金鑰、地圖 ID、預設中心座標</p>
            </div>
            {settings.google_maps.api_key
              ? <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">已設定</span>
              : <span className="text-xs text-yellow-600 font-medium bg-yellow-100 px-2 py-0.5 rounded-full">未設定</span>}
            {openSection === 'maps' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {openSection === 'maps' && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                  <KeyRound size={12} />API 金鑰（Google Maps API Key）
                </label>
                <div className="relative">
                  <input type={showKeys['maps_key'] ? 'text' : 'password'}
                    value={settings.google_maps.api_key}
                    onChange={e => setMaps('api_key', e.target.value)}
                    placeholder="AIzaSy…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
                  <button type="button" onClick={() => toggleShow('maps_key')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showKeys['maps_key'] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {!showKeys['maps_key'] && settings.google_maps.api_key && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">{maskSecret(settings.google_maps.api_key)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">地圖 ID（Map ID，選填）</label>
                <input type="text" value={settings.google_maps.map_id} onChange={e => setMaps('map_id', e.target.value)}
                  placeholder="留空使用預設樣式"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">預設地圖中心</label>
                <div className="grid grid-cols-3 gap-3">
                  {[['緯度（Lat）', 'default_lat'], ['經度（Lng）', 'default_lng'], ['縮放層級', 'default_zoom']].map(([label, field]) => (
                    <div key={field}>
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <input type="text" value={settings.google_maps[field as keyof typeof settings.google_maps]}
                        onChange={e => setMaps(field, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── AppSheet ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button type="button" onClick={() => toggleSection('appsheet')}
            className="w-full flex items-center gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
              <Zap size={16} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">AppSheet 同步設定</p>
              <p className="text-xs text-gray-400 mt-0.5">App ID、API Access Key、Google Sheets ID</p>
            </div>
            {settings.appsheet.app_id && settings.appsheet.access_key
              ? <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">已設定</span>
              : <span className="text-xs text-yellow-600 font-medium bg-yellow-100 px-2 py-0.5 rounded-full">未設定</span>}
            {openSection === 'appsheet' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {openSection === 'appsheet' && (
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-xs text-purple-700 space-y-1">
                <p className="font-semibold">取得 AppSheet API 憑證步驟：</p>
                <ol className="list-decimal list-inside space-y-0.5 text-purple-600">
                  <li>前往 AppSheet 後台 → Manage → Integrations</li>
                  <li>在「IN: from cloud services to your app」區段取得 <strong>App ID</strong></li>
                  <li>點擊「Enable」產生 <strong>Application Access Key</strong></li>
                  <li>從 Google Sheets URL 複製 <strong>試算表 ID</strong></li>
                </ol>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">AppSheet App ID</label>
                <input type="text" value={settings.appsheet.app_id} onChange={e => setAppSheet('app_id', e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                  <KeyRound size={12} />Application Access Key
                </label>
                <div className="relative">
                  <input type={showKeys['appsheet_key'] ? 'text' : 'password'}
                    value={settings.appsheet.access_key} onChange={e => setAppSheet('access_key', e.target.value)}
                    placeholder="V2-xxxx-xxxxxxxxxxxx…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono" />
                  <button type="button" onClick={() => toggleShow('appsheet_key')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showKeys['appsheet_key'] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {!showKeys['appsheet_key'] && settings.appsheet.access_key && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">{maskSecret(settings.appsheet.access_key)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Google Sheets 試算表 ID</label>
                <input type="text" value={settings.appsheet.spreadsheet_id}
                  onChange={e => setAppSheet('spreadsheet_id', e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono" />
                <p className="text-xs text-gray-400 mt-1">從 Google Sheets 網址中 /d/ 後的字串取得</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Sync tables ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button type="button" onClick={() => toggleSection('sync')}
            className="w-full flex items-center gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <TableProperties size={16} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">同步資料表</p>
              <p className="text-xs text-gray-400 mt-0.5">選擇資料表、設定同步頻率、手動觸發同步</p>
            </div>
            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
              {enabledCount} / {settings.sync_tables.length} 啟用
            </span>
            {openSection === 'sync' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {openSection === 'sync' && (
            <div className="p-6 space-y-5">

              {/* ── Auto-sync global toggle ── */}
              <div className={`rounded-xl border-2 p-4 transition-colors ${settings.auto_sync_enabled ? 'border-green-300 bg-green-50/40' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => setSettings(p => p ? { ...p, auto_sync_enabled: !p.auto_sync_enabled } : p)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${settings.auto_sync_enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.auto_sync_enabled ? 'left-6' : 'left-1'}`} />
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${settings.auto_sync_enabled ? 'text-green-800' : 'text-gray-700'}`}>
                      自動同步排程
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {settings.auto_sync_enabled
                        ? `已啟用 · ${scheduledCount} 張資料表設有排程`
                        : '關閉時所有資料表皆須手動按下同步按鈕'}
                    </p>
                  </div>
                  {settings.auto_sync_enabled && (
                    <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                      <Play size={11} className="fill-green-600 text-green-600" />執行中
                    </div>
                  )}
                  {!settings.auto_sync_enabled && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                      <Square size={11} />已停止
                    </div>
                  )}
                </div>
                {settings.auto_sync_enabled && scheduledCount === 0 && (
                  <p className="mt-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} />自動同步已開啟，但所有資料表的同步頻率均設為「僅手動」，請至少設定一張資料表的頻率。
                  </p>
                )}
              </div>

              {/* ── Sync all button ── */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  同步方向：本地資料庫 → AppSheet（{settings.appsheet.app_id ? 'App ID 已設定' : 'App ID 未設定'}）
                </p>
                <button onClick={() => handleSync(null)}
                  disabled={syncing !== null || enabledCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {syncing === 'all' ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  全部同步
                </button>
              </div>

              {/* ── Table cards ── */}
              <div className="space-y-3">
                {settings.sync_tables.map((tbl: SyncTableConfig) => {
                  const st = STATUS_MAP[tbl.last_sync_status]
                  const isSyncing = syncing === tbl.id || syncing === 'all'
                  const isCustom = customIntervals[tbl.id] || (!PRESET_INTERVALS.some(p => p.value === tbl.interval_minutes) && tbl.interval_minutes > 0)
                  const countdown = settings.auto_sync_enabled && tbl.enabled && tbl.interval_minutes > 0
                    ? nextSyncIn(tbl.last_sync_at, tbl.interval_minutes)
                    : null
                  // force countdown to re-evaluate on every tick
                  void tick

                  return (
                    <div key={tbl.id} className={`border rounded-xl overflow-hidden transition-colors ${tbl.enabled ? 'border-gray-200' : 'border-dashed border-gray-200'}`}>
                      {/* Card header */}
                      <div className={`p-4 ${tbl.enabled ? 'bg-white' : 'bg-gray-50'}`}>
                        <div className="flex items-start gap-3">
                          {/* Enabled toggle */}
                          <button type="button" onClick={() => toggleTable(tbl.id)}
                            className={`mt-0.5 w-10 h-6 rounded-full transition-colors relative shrink-0 ${tbl.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${tbl.enabled ? 'left-5' : 'left-1'}`} />
                          </button>

                          <div className="flex-1 min-w-0">
                            {/* Name row */}
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-gray-800">{tbl.appsheet_table}</span>
                              <span className="text-xs text-gray-400">→</span>
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {DB_TABLE_LABELS[tbl.db_table] ?? tbl.db_table}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">{tbl.description}</p>
                          </div>

                          {/* Manual sync button */}
                          <button onClick={() => handleSync([tbl.id])}
                            disabled={!tbl.enabled || isSyncing}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                            同步
                          </button>
                        </div>

                        {/* Status row */}
                        {tbl.enabled && (
                          <div className="mt-3 flex items-center gap-3 flex-wrap pl-13">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                              {tbl.last_sync_status === 'success' && <CheckCircle2 size={10} />}
                              {tbl.last_sync_status === 'error' && <AlertCircle size={10} />}
                              {tbl.last_sync_status === 'never' && <Clock size={10} />}
                              {st.label}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={10} />上次：{formatTime(tbl.last_sync_at)}
                            </span>
                            {tbl.last_sync_count !== null && tbl.last_sync_status === 'success' && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Database size={10} />{tbl.last_sync_count} 筆
                              </span>
                            )}
                            {tbl.last_sync_error && (
                              <span className="text-xs text-red-500 truncate max-w-xs">{tbl.last_sync_error}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Interval row — only when enabled */}
                      {tbl.enabled && (
                        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                              <Timer size={12} className="text-gray-400" />同步頻率
                            </div>

                            {/* Preset selector */}
                            <select
                              value={isCustom ? -1 : tbl.interval_minutes}
                              onChange={e => {
                                const val = Number(e.target.value)
                                if (val === -1) {
                                  setCustomIntervals(p => ({ ...p, [tbl.id]: true }))
                                } else {
                                  setCustomIntervals(p => ({ ...p, [tbl.id]: false }))
                                  setTableInterval(tbl.id, val)
                                }
                              }}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                              {PRESET_INTERVALS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                              ))}
                            </select>

                            {/* Custom interval input */}
                            {isCustom && (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number" min={1} max={1440}
                                  value={tbl.interval_minutes || ''}
                                  onChange={e => setTableInterval(tbl.id, Math.max(1, Number(e.target.value)))}
                                  placeholder="分鐘數"
                                  className="w-20 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 font-mono text-center"
                                />
                                <span className="text-xs text-gray-400">分鐘</span>
                              </div>
                            )}

                            {/* Countdown */}
                            {countdown && (
                              <span className={`ml-auto flex items-center gap-1 text-xs font-medium ${settings.auto_sync_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                <Timer size={11} />
                                {settings.auto_sync_enabled ? `下次同步：${countdown}` : '自動同步未啟用'}
                              </span>
                            )}
                            {tbl.interval_minutes === 0 && (
                              <span className="ml-auto text-xs text-gray-400">僅手動同步</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Save ─────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-2 pb-8">
          <button onClick={load} disabled={loading || saving}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />重新載入
          </button>
          <button onClick={handleSave} disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            儲存設定
          </button>
        </div>

      </div>
    </div>
  )
}
