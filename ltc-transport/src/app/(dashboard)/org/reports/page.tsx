'use client'
import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { BarChart3, TrendingUp, Users, Calendar, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import type { EnrichedBooking } from '@/lib/queries/bookings'

// ── 工具函式 ───────────────────────────────────────────────────
function ym(dateStr: string) { return dateStr.slice(0, 7) }
function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return `${y}/${m}`
}
function todayYM() { return new Date().toISOString().slice(0, 7) }

const STATUS_COLOR: Record<string, string> = {
  '待指派': 'bg-amber-400', '已指派': 'bg-blue-400',
  '進行中': 'bg-green-500', '已完成': 'bg-gray-400',
  '請假': 'bg-orange-400', '取消': 'bg-red-300',
}

interface MonthStats {
  month: string
  total: number
  completed: number
  cancelled: number
  leave: number
  byPassenger: Record<string, { name: string; count: number; absent: number }>
}

// ── 主頁面 ────────────────────────────────────────────────────
export default function ReportsPage() {
  const [viewMonth, setViewMonth]   = useState(todayYM)
  const [stats, setStats]           = useState<MonthStats | null>(null)
  const [trend, setTrend]           = useState<{ month: string; total: number; completed: number }[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({})

  // ── 載入當月資料 ────────────────────────────────────────────
  const loadMonth = useCallback(async (m: string) => {
    setLoading(true)
    try {
      const startDate = `${m}-01`
      const lastDay   = new Date(Number(m.split('-')[0]), Number(m.split('-')[1]), 0).getDate()
      const endDate   = `${m}-${lastDay}`

      const res  = await fetch(`/api/bookings?start_date=${startDate}&end_date=${endDate}&limit=2000`)
      const json = await res.json()
      const rows: EnrichedBooking[] = json.data ?? []

      // 月統計
      const byPassenger: MonthStats['byPassenger'] = {}
      rows.forEach(b => {
        const pid  = b.passenger_id
        const name = b.passenger?.name ?? pid.slice(0, 8)
        if (!byPassenger[pid]) byPassenger[pid] = { name, count: 0, absent: 0 }
        byPassenger[pid].count++
        if (b.status === '請假' || b.status === '取消') byPassenger[pid].absent++
      })

      const breakdown: Record<string, number> = {}
      rows.forEach(b => { breakdown[b.status] = (breakdown[b.status] ?? 0) + 1 })

      setStats({
        month: m,
        total:     rows.length,
        completed: rows.filter(b => b.status === '已完成').length,
        cancelled: rows.filter(b => b.status === '取消').length,
        leave:     rows.filter(b => b.status === '請假').length,
        byPassenger,
      })
      setStatusBreakdown(breakdown)
    } catch {
      setStats(null)
    }
    setLoading(false)
  }, [])

  // ── 載入近 6 個月趨勢 ──────────────────────────────────────
  const loadTrend = useCallback(async () => {
    const months = Array.from({ length: 6 }, (_, i) => addMonths(todayYM(), -5 + i))
    const results = await Promise.all(months.map(async m => {
      const startDate = `${m}-01`
      const lastDay   = new Date(Number(m.split('-')[0]), Number(m.split('-')[1]), 0).getDate()
      const endDate   = `${m}-${lastDay}`
      try {
        const res  = await fetch(`/api/bookings?start_date=${startDate}&end_date=${endDate}&limit=2000`)
        const json = await res.json()
        const rows: EnrichedBooking[] = json.data ?? []
        return { month: m, total: rows.length, completed: rows.filter(b => b.status === '已完成').length }
      } catch {
        return { month: m, total: 0, completed: 0 }
      }
    }))
    setTrend(results)
  }, [])

  useEffect(() => { loadMonth(viewMonth) }, [viewMonth, loadMonth])
  useEffect(() => { loadTrend() }, [loadTrend])

  const trendMax = Math.max(...trend.map(t => t.total), 1)

  // 出席率排序
  const passengerList = stats
    ? Object.values(stats.byPassenger)
        .map(p => ({ ...p, rate: p.count > 0 ? Math.round(((p.count - p.absent) / p.count) * 100) : 100 }))
        .sort((a, b) => a.rate - b.rate)
    : []

  return (
    <div>
      <TopBar title="統計報表" subtitle="服務量趨勢與個案出席分析" />

      <div className="p-6 space-y-6">

        {/* ── 月份切換 ──────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMonth(m => addMonths(m, -1))}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <span className="text-lg font-bold text-gray-800 min-w-[7rem] text-center">{viewMonth.replace('-', ' 年 ')} 月</span>
          <button onClick={() => setViewMonth(m => addMonths(m, 1))} disabled={viewMonth >= todayYM()}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => loadMonth(viewMonth)}
            className="ml-auto p-2 text-gray-400 hover:text-gray-700">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* ── KPI 卡片 ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '本月總趟次', value: stats?.total ?? 0, icon: <Calendar size={18} className="text-blue-500" />, color: 'bg-blue-50' },
            { label: '已完成', value: stats?.completed ?? 0, icon: <TrendingUp size={18} className="text-green-500" />, color: 'bg-green-50' },
            { label: '請假次數', value: stats?.leave ?? 0, icon: <Users size={18} className="text-orange-500" />, color: 'bg-orange-50' },
            { label: '取消次數', value: stats?.cancelled ?? 0, icon: <BarChart3 size={18} className="text-red-400" />, color: 'bg-red-50' },
          ].map(kpi => (
            <div key={kpi.label} className={`${kpi.color} rounded-xl px-5 py-4 flex items-center gap-4`}>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                {kpi.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {loading ? '…' : kpi.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── 近 6 個月趨勢圖 ────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-500" />近 6 個月服務趟次
            </h3>
            <div className="flex items-end gap-2 h-36">
              {trend.map(t => {
                const barH = trendMax > 0 ? Math.round((t.total / trendMax) * 100) : 0
                const compH = t.total > 0 ? Math.round((t.completed / t.total) * barH) : 0
                const isCurrent = t.month === viewMonth
                return (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-500 font-medium tabular-nums">{t.total || ''}</p>
                    <div className={`w-full relative rounded-t overflow-hidden ${isCurrent ? 'ring-2 ring-green-400' : ''}`}
                      style={{ height: `${Math.max(barH, 4)}%` }}>
                      <div className="absolute inset-0 bg-gray-100 rounded-t" />
                      <div className="absolute bottom-0 left-0 right-0 bg-green-400 rounded-t"
                        style={{ height: `${compH}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400">{monthLabel(t.month)}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />已完成</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" />其他狀態</span>
            </div>
          </div>

          {/* ── 狀態分佈圓環圖（CSS 模擬）──────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-500" />本月訂單狀態分佈
            </h3>
            {loading ? (
              <div className="h-36 flex items-center justify-center text-gray-300">
                <RefreshCw size={24} className="animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(STATUS_COLOR).map(([s, cls]) => {
                  const cnt = statusBreakdown[s] ?? 0
                  const total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? Math.round((cnt / total) * 100) : 0
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-12 shrink-0">{s}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${cls} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums w-14 text-right">
                        {cnt} 筆 ({pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 個案出席率 ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users size={16} className="text-purple-500" />個案出席率
            </h3>
            <span className="text-sm text-gray-400">{viewMonth.replace('-', ' 年 ')} 月</span>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-gray-300">
              <RefreshCw size={24} className="animate-spin mx-auto" />
            </div>
          ) : passengerList.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">本月無資料</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['個案姓名', '總次數', '請假/取消', '出席次數', '出席率', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {passengerList.map(p => (
                    <tr key={p.name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-5 py-3 text-gray-600">{p.count}</td>
                      <td className="px-5 py-3 text-gray-500">{p.absent}</td>
                      <td className="px-5 py-3 text-gray-600">{p.count - p.absent}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.rate >= 90 ? 'bg-green-500' : p.rate >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${p.rate}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums ${p.rate >= 90 ? 'text-green-600' : p.rate >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                            {p.rate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {p.rate < 70 && (
                          <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">需關注</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
