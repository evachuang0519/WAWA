import { getSession } from '@/lib/auth'
import { getDashboardStats, BOOKING_RECORDS, DRIVERS, VEHICLES, PASSENGERS, CARE_UNITS } from '@/lib/db'
import TopBar from '@/components/layout/TopBar'
import Badge from '@/components/ui/Badge'
import DriverDashboard from '@/components/driver/DriverDashboard'
import {
  CheckCircle2, Clock, AlertTriangle, Users,
  Car, TrendingUp, CalendarDays, MapPin
} from 'lucide-react'

export default async function DashboardPage() {
  const user = await getSession()

  // 駕駛角色：顯示專屬儀表板
  if (user?.role === 'driver') {
    return (
      <div>
        <TopBar title="儀表板" subtitle="駕駛工作總覽" />
        <DriverDashboard user={user} />
      </div>
    )
  }
  const stats = getDashboardStats()
  const today = new Date().toISOString().split('T')[0]
  const todayBookings = BOOKING_RECORDS.filter(b => b.service_date === today)
  const todayDate = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const statCards = [
    { label: '今日趟次', value: stats.today_trips, icon: <CalendarDays size={22} />, color: 'bg-blue-500', change: '+2 較昨日' },
    { label: '已完成', value: stats.completed_today, icon: <CheckCircle2 size={22} />, color: 'bg-green-500', change: `${stats.completion_rate}% 完成率` },
    { label: '待指派', value: stats.pending_assign, icon: <AlertTriangle size={22} />, color: 'bg-yellow-500', change: '需要處理' },
    { label: '在線駕駛', value: stats.active_drivers, icon: <Users size={22} />, color: 'bg-purple-500', change: `共 ${DRIVERS.length} 位` },
    { label: '可用車輛', value: VEHICLES.filter(v => v.status === 'available').length, icon: <Car size={22} />, color: 'bg-indigo-500', change: `共 ${VEHICLES.length} 台` },
    { label: '服務個案', value: stats.total_passengers, icon: <TrendingUp size={22} />, color: 'bg-rose-500', change: `${CARE_UNITS.length} 個機構` },
  ]

  return (
    <div>
      <TopBar title="儀表板" subtitle={todayDate} />

      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-1">歡迎回來，{user?.name} 👋</h2>
          <p className="text-green-100 text-sm">今日共有 {stats.today_trips} 趟服務，{stats.completed_today} 趟已完成，{stats.pending_assign} 筆待指派。</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statCards.map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white mb-3`}>
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm font-medium text-gray-600 mt-0.5">{card.label}</p>
              <p className="text-xs text-gray-400 mt-1">{card.change}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's schedule */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">今日班表</h3>
              <span className="text-xs text-gray-500">{todayBookings.length} 筆</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">時間</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">乘客</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">路線</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {todayBookings.map(b => {
                    const passenger = PASSENGERS.find(p => p.id === b.passenger_id)
                    const cu = CARE_UNITS.find(c => c.id === b.care_unit_id)
                    return (
                      <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-800">{b.service_time}</span>
                          <span className="ml-2 text-xs text-gray-400">{b.direction}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{passenger?.name}</p>
                          <p className="text-xs text-gray-400">{cu?.short_name}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-gray-400" />
                            {b.pickup_address?.substring(0, 12)}...
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge value={b.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right sidebar stats */}
          <div className="space-y-4">
            {/* Expiry alerts */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">到期提醒</h3>
              <div className="space-y-3">
                {VEHICLES.filter(v => v.insurance_expiry).slice(0, 3).map(v => {
                  const daysLeft = Math.ceil((new Date(v.insurance_expiry!).getTime() - Date.now()) / 86400000)
                  const urgent = daysLeft < 60
                  return (
                    <div key={v.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{v.plate_number}</p>
                        <p className="text-xs text-gray-400">保險到期</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${urgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {daysLeft}天
                      </span>
                    </div>
                  )
                })}
                {DRIVERS.filter(d => d.license_expiry).slice(0, 2).map(d => {
                  const daysLeft = Math.ceil((new Date(d.license_expiry!).getTime() - Date.now()) / 86400000)
                  const urgent = daysLeft < 90
                  return (
                    <div key={d.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{d.name}</p>
                        <p className="text-xs text-gray-400">駕照到期</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${urgent ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                        {daysLeft}天
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">今日狀態分佈</h3>
              {(['已完成', '已指派', '待指派', '請假', '取消'] as const).map(status => {
                const count = todayBookings.filter(b => b.status === status).length
                const pct = todayBookings.length ? Math.round((count / todayBookings.length) * 100) : 0
                return (
                  <div key={status} className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">{status}</span>
                      <span className="text-xs font-medium text-gray-800">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
