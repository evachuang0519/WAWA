'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Truck, Users, FileText,
  ClipboardList, MapPin, BarChart3, Settings, LogOut,
  Car, UserCheck, CalendarDays, ChevronRight, Repeat2
} from 'lucide-react'
import type { AuthUser } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: '儀表板', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  // Admin
  { label: '長照單位管理', href: '/admin/care-units', icon: <Building2 size={18} />, roles: ['system_admin'] },
  { label: '車行管理', href: '/admin/companies', icon: <Truck size={18} />, roles: ['system_admin'] },
  { label: '帳號管理', href: '/admin/users', icon: <Users size={18} />, roles: ['system_admin'] },
  { label: '跨機構報表', href: '/admin/reports', icon: <BarChart3 size={18} />, roles: ['system_admin'] },
  // Org admin
  { label: '個案管理', href: '/org/passengers', icon: <UserCheck size={18} />, roles: ['org_admin', 'system_admin'] },
  { label: '訂車管理', href: '/org/bookings', icon: <ClipboardList size={18} />, roles: ['org_admin', 'system_admin'] },
  { label: '本週班表', href: '/org/schedule', icon: <CalendarDays size={18} />, roles: ['org_admin', 'system_admin'] },
  { label: '週期排班', href: '/org/recurring', icon: <Repeat2 size={18} />, roles: ['org_admin', 'system_admin'] },
  { label: '服務紀錄', href: '/org/records', icon: <FileText size={18} />, roles: ['org_admin', 'system_admin'] },
  { label: '統計報表', href: '/org/reports', icon: <BarChart3 size={18} />, roles: ['org_admin', 'system_admin'] },
  // Fleet admin
  { label: '車輛管理', href: '/fleet/vehicles', icon: <Car size={18} />, roles: ['fleet_admin', 'system_admin'] },
  { label: '駕駛管理', href: '/fleet/drivers', icon: <Users size={18} />, roles: ['fleet_admin', 'system_admin'] },
  { label: '任務指派', href: '/fleet/assignments', icon: <MapPin size={18} />, roles: ['fleet_admin', 'system_admin'] },
  { label: '即時地圖', href: '/fleet/map', icon: <MapPin size={18} />, roles: ['fleet_admin', 'system_admin', 'org_admin'] },
  // Driver
  { label: '今日任務', href: '/driver/tasks', icon: <ClipboardList size={18} />, roles: ['driver'] },
  { label: '歷史任務', href: '/driver/history', icon: <CalendarDays size={18} />, roles: ['driver'] },
  { label: '修改服務資料', href: '/driver/records', icon: <FileText size={18} />, roles: ['driver'] },
]

interface SidebarProps { user: AuthUser }

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(user.role)
  )

  const roleLabel: Record<string, string> = {
    system_admin: '系統管理者',
    org_admin: '長照單位',
    fleet_admin: '車行管理',
    driver: '駕駛',
    viewer: '唯讀帳號',
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Truck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">長照交通</p>
            <p className="text-gray-400 text-xs">服務管理平台</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-gray-400 text-xs">{roleLabel[user.role] || user.role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1 border-t border-gray-700 pt-3">
        {user.role === 'system_admin' && (
          <Link href="/admin/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith('/admin/settings') ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Settings size={18} />系統設定
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-900 hover:text-red-300 transition-colors"
        >
          <LogOut size={18} />登出
        </button>
      </div>
    </aside>
  )
}
