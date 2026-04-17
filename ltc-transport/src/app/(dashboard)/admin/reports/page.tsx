import TopBar from '@/components/layout/TopBar'
import { BOOKING_RECORDS, SERVICE_RECORDS, CARE_UNITS, DRIVERS, VEHICLES, PASSENGERS } from '@/lib/db'
import { Download, TrendingUp, BarChart3, PieChart } from 'lucide-react'

const today = new Date().toISOString().split('T')[0]

export default function ReportsPage() {
  const completedBookings = BOOKING_RECORDS.filter(b => b.status === '已完成')
  const totalDistance = SERVICE_RECORDS.reduce((s, r) => s + (r.distance_km || 0), 0)

  const statusCounts = ['待指派', '已指派', '進行中', '已完成', '請假', '取消'].map(s => ({
    label: s,
    count: BOOKING_RECORDS.filter(b => b.status === s).length,
  }))

  const careUnitStats = CARE_UNITS.map(cu => ({
    name: cu.short_name,
    total: BOOKING_RECORDS.filter(b => b.care_unit_id === cu.id).length,
    completed: BOOKING_RECORDS.filter(b => b.care_unit_id === cu.id && b.status === '已完成').length,
  }))

  return (
    <div>
      <TopBar title="跨機構報表" subtitle="系統整體運營數據與統計分析" />
      <div className="p-6 space-y-6">

        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['今日', '本週', '本月', '自訂'].map(s => (
              <button key={s} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${s === '今日' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{s}</button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={15} />匯出報表
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '今日總趟次', value: BOOKING_RECORDS.filter(b => b.service_date === today).length, unit: '趟', icon: <TrendingUp size={20} />, color: 'text-green-600 bg-green-100' },
            { label: '服務個案數', value: PASSENGERS.filter(p => p.status === 'active').length, unit: '人', icon: <BarChart3 size={20} />, color: 'text-blue-600 bg-blue-100' },
            { label: '在線駕駛', value: DRIVERS.filter(d => d.status === 'active').length, unit: '人', icon: <PieChart size={20} />, color: 'text-purple-600 bg-purple-100' },
            { label: '累計里程', value: totalDistance.toFixed(1), unit: 'km', icon: <TrendingUp size={20} />, color: 'text-orange-600 bg-orange-100' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.color}`}>{kpi.icon}</div>
              </div>
              <p className="text-2xl font-bold text-gray-800">{kpi.value} <span className="text-sm font-normal text-gray-400">{kpi.unit}</span></p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Status breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><PieChart size={16} />訂車狀態分佈</h3>
            <div className="space-y-3">
              {statusCounts.map(({ label, count }) => {
                const total = BOOKING_RECORDS.length
                const pct = total ? Math.round((count / total) * 100) : 0
                const barColors: Record<string, string> = {
                  '待指派': 'bg-yellow-400', '已指派': 'bg-blue-400', '進行中': 'bg-green-400',
                  '已完成': 'bg-gray-400', '請假': 'bg-red-400', '取消': 'bg-red-200'
                }
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-gray-700">{count} 筆 ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${barColors[label] || 'bg-gray-400'}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Per care unit */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={16} />各機構服務量</h3>
            <div className="space-y-4">
              {careUnitStats.map(({ name, total, completed }) => {
                const pct = total ? Math.round((completed / total) * 100) : 0
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{name}</span>
                      <span className="text-gray-500">{completed}/{total} 完成 ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full bg-green-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Driver performance */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">駕駛服務統計</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['駕駛', '車行', '今日趟次', '累計里程', '完成率', '狀態'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: '張志明', company: '安心', trips: 2, km: 10.4, rate: 100 },
                { name: '李建國', company: '安心', trips: 0, km: 0, rate: 0 },
                { name: '王大同', company: '康復', trips: 1, km: 5.2, rate: 100 },
              ].map(d => (
                <tr key={d.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.company}</td>
                  <td className="px-4 py-3 text-gray-700">{d.trips} 趟</td>
                  <td className="px-4 py-3 text-gray-700">{d.km} km</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${d.rate}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-600">{d.rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">在線</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
