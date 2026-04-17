import type { BookingStatus, ServiceStatus, VehicleStatus, DriverStatus } from '@/types'

// ── 色彩對照 ──────────────────────────────────────────────────
const colorMap: Record<string, string> = {
  // Booking
  '待指派': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  '已指派': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  '進行中': 'bg-green-50 text-green-700 ring-1 ring-green-200',
  '已完成': 'bg-gray-100 text-gray-500',
  '請假':   'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  '取消':   'bg-red-50 text-red-400',
  '預約':   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  // Vehicle
  available:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  in_service:  'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  maintenance: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  retired:     'bg-gray-100 text-gray-500',
  // Driver
  active:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  leave:    'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  resigned: 'bg-gray-100 text-gray-500',
  // Org / User
  inactive:  'bg-gray-100 text-gray-500',
  suspended: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  pending:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  discharged:'bg-gray-100 text-gray-500',
}

// ── 標籤對照 ──────────────────────────────────────────────────
const labelMap: Record<string, string> = {
  available:    '可用',
  in_service:   '服務中',
  maintenance:  '維修中',
  retired:      '退役',
  active:       '正常',
  leave:        '請假',
  resigned:     '離職',
  sedan:        '轎車',
  van:          '廂型車',
  wheelchair_van: '無障礙車',
  bus:          '巴士',
  inactive:     '停用',
  suspended:    '停權',
  pending:      '待審核',
  discharged:   '已結案',
}

// ── 狀態前置點（需要動態脈衝或顏色點的項目）────────────────────
const dotMap: Record<string, string> = {
  '待指派': 'bg-amber-400 animate-pulse',
  '已指派': 'bg-blue-400',
  '進行中': 'bg-green-500 animate-pulse',
  '請假':   'bg-orange-400',
  available:  'bg-emerald-400',
  in_service: 'bg-blue-400 animate-pulse',
  active:     'bg-emerald-400',
}

interface BadgeProps {
  value: string
  className?: string
  dot?: boolean   // 強制顯示點；預設 undefined（自動判斷）
}

export default function Badge({ value, className = '', dot }: BadgeProps) {
  const color  = colorMap[value] ?? 'bg-gray-100 text-gray-500'
  const label  = labelMap[value] ?? value
  const dotCls = dotMap[value]
  const showDot = dot ?? !!dotCls

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}>
      {showDot && dotCls && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
      )}
      {label}
    </span>
  )
}
