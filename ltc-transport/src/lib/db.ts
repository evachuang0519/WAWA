// ============================================================
// 模擬資料庫 — ID 與 scripts/init-db.sql seed 資料完全對應
// 連接真實 PostgreSQL 後，此檔案用於 UI 下拉選單等參考資料
// ============================================================
import type {
  CareUnit, TransportCompany, Vehicle, Driver,
  Passenger, BookingRecord, TaskAssignment, ServiceRecord, DashboardStats
} from '@/types'

// UUID 對照 (cu-1 = 10000000-...-0001, p-1 = 50000000-...-0001, etc.)
const CU = (n: number) => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const TC = (n: number) => `20000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const VH = (n: number) => `30000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const DR = (n: number) => `40000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const PA = (n: number) => `50000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const BR = (n: number) => `60000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const TA = (n: number) => `70000000-0000-0000-0000-${String(n).padStart(12, '0')}`

// ── Care Units ───────────────────────────────────────────────
export const CARE_UNITS: CareUnit[] = [
  { id: CU(1), name: '照橙日照中心', short_name: '照橙', address: '台中市西區民權路100號', phone: '04-12345678', contact_name: '王主任', region: '台中市', status: 'active', created_at: '2025-01-01' },
  { id: CU(2), name: '頤養日照中心', short_name: '頤養', address: '台中市北區中清路200號', phone: '04-87654321', contact_name: '李主任', region: '台中市', status: 'active', created_at: '2025-01-01' },
  { id: CU(3), name: '慈心長照機構', short_name: '慈心', address: '台中市南屯區大墩路300號', phone: '04-33334444', contact_name: '陳主任', region: '台中市', status: 'active', created_at: '2025-02-01' },
]

// ── Transport Companies ──────────────────────────────────────
export const TRANSPORT_COMPANIES: TransportCompany[] = [
  { id: TC(1), name: '安心車行', short_name: '安心', phone: '04-11112222', contact_name: '陳老闆', status: 'active', created_at: '2025-01-01' },
  { id: TC(2), name: '康復交通', short_name: '康復', phone: '04-33334444', contact_name: '林老闆', status: 'active', created_at: '2025-01-01' },
]

// ── Vehicles ─────────────────────────────────────────────────
export const VEHICLES: Vehicle[] = [
  { id: VH(1), company_id: TC(1), plate_number: 'ABC-1234', type: 'wheelchair_van', capacity: 6, wheelchair_slots: 2, brand: 'Toyota', model: 'Hiace', insurance_expiry: '2026-06-30', inspection_due: '2025-12-31', status: 'available' },
  { id: VH(2), company_id: TC(1), plate_number: 'DEF-5678', type: 'van', capacity: 8, wheelchair_slots: 0, brand: 'Ford', model: 'Transit', insurance_expiry: '2026-03-31', inspection_due: '2025-09-30', status: 'available' },
  { id: VH(3), company_id: TC(2), plate_number: 'GHI-9012', type: 'wheelchair_van', capacity: 6, wheelchair_slots: 2, brand: 'Mercedes', model: 'Sprinter', insurance_expiry: '2026-08-31', inspection_due: '2026-02-28', status: 'available' },
  { id: VH(4), company_id: TC(2), plate_number: 'JKL-3456', type: 'sedan', capacity: 4, wheelchair_slots: 0, brand: 'Toyota', model: 'Camry', insurance_expiry: '2025-11-30', inspection_due: '2025-11-30', status: 'maintenance' },
]

// ── Drivers ──────────────────────────────────────────────────
export const DRIVERS: Driver[] = [
  { id: DR(1), company_id: TC(1), name: '張志明', phone: '0912-111-222', license_number: 'A123456789', license_class: '職業小客', license_expiry: '2027-05-31', health_cert_expiry: '2025-12-31', status: 'active' },
  { id: DR(2), company_id: TC(1), name: '李建國', phone: '0923-333-444', license_number: 'B987654321', license_class: '職業大客', license_expiry: '2026-08-31', health_cert_expiry: '2026-06-30', status: 'active' },
  { id: DR(3), company_id: TC(2), name: '王大同', phone: '0934-555-666', license_number: 'C246810121', license_class: '職業小客', license_expiry: '2026-12-31', health_cert_expiry: '2025-09-30', status: 'active' },
  { id: DR(4), company_id: TC(2), name: '林小華', phone: '0945-777-888', license_number: 'D135791113', license_class: '職業小客', license_expiry: '2025-06-30', health_cert_expiry: '2026-03-31', status: 'leave' },
]

// ── Passengers ───────────────────────────────────────────────
export const PASSENGERS: Passenger[] = [
  { id: PA(1), care_unit_id: CU(1), name: '陳美玲', phone: '0911-000-001', emergency_contact: '陳大文', emergency_phone: '0922-000-001', home_address: '台中市西區民生路1號', pickup_address: '台中市西區民生路1號', dropoff_address: '照橙日照中心', wheelchair: false, status: 'active' },
  { id: PA(2), care_unit_id: CU(1), name: '黃志偉', phone: '0911-000-002', emergency_contact: '黃大偉', emergency_phone: '0922-000-002', home_address: '台中市西區自由路2號', pickup_address: '台中市西區自由路2號', dropoff_address: '照橙日照中心', wheelchair: true, status: 'active' },
  { id: PA(3), care_unit_id: CU(1), name: '林秀蘭', phone: '0911-000-003', emergency_contact: '林建明', emergency_phone: '0922-000-003', home_address: '台中市北區健行路3號', pickup_address: '台中市北區健行路3號', dropoff_address: '照橙日照中心', wheelchair: false, status: 'active' },
  { id: PA(4), care_unit_id: CU(2), name: '王福祥', phone: '0911-000-004', emergency_contact: '王小明', emergency_phone: '0922-000-004', home_address: '台中市北區中清路4號', pickup_address: '台中市北區中清路4號', dropoff_address: '頤養日照中心', wheelchair: true, status: 'active' },
  { id: PA(5), care_unit_id: CU(2), name: '吳雅惠', phone: '0911-000-005', emergency_contact: '吳建國', emergency_phone: '0922-000-005', home_address: '台中市北區大雅路5號', pickup_address: '台中市北區大雅路5號', dropoff_address: '頤養日照中心', wheelchair: false, status: 'active' },
]

// ── Booking Records (記憶體初始種子，未連 DB 時使用) ──────────
const today = new Date().toISOString().split('T')[0]
export const BOOKING_RECORDS: BookingRecord[] = [
  { id: BR(1), care_unit_id: CU(1), passenger_id: PA(1), booking_date: today, service_date: today, service_time: '08:00', direction: '去程', pickup_address: '台中市西區民生路1號', dropoff_address: '照橙日照中心', wheelchair: false, status: '已指派', created_at: today },
  { id: BR(2), care_unit_id: CU(1), passenger_id: PA(2), booking_date: today, service_date: today, service_time: '08:15', direction: '去程', pickup_address: '台中市西區自由路2號', dropoff_address: '照橙日照中心', wheelchair: true, status: '已指派', created_at: today },
  { id: BR(3), care_unit_id: CU(1), passenger_id: PA(3), booking_date: today, service_date: today, service_time: '08:30', direction: '去程', pickup_address: '台中市北區健行路3號', dropoff_address: '照橙日照中心', wheelchair: false, status: '待指派', created_at: today },
  { id: BR(4), care_unit_id: CU(2), passenger_id: PA(4), booking_date: today, service_date: today, service_time: '08:00', direction: '去程', pickup_address: '台中市北區中清路4號', dropoff_address: '頤養日照中心', wheelchair: true, status: '已完成', created_at: today },
  { id: BR(5), care_unit_id: CU(2), passenger_id: PA(5), booking_date: today, service_date: today, service_time: '08:20', direction: '去程', pickup_address: '台中市北區大雅路5號', dropoff_address: '頤養日照中心', wheelchair: false, status: '請假', created_at: today },
]

// ── Task Assignments ─────────────────────────────────────────
export const TASK_ASSIGNMENTS: TaskAssignment[] = [
  { id: TA(1), booking_id: BR(1), driver_id: DR(1), vehicle_id: VH(1), assigned_at: today },
  { id: TA(2), booking_id: BR(2), driver_id: DR(1), vehicle_id: VH(1), assigned_at: today },
  { id: TA(3), booking_id: BR(4), driver_id: DR(3), vehicle_id: VH(3), assigned_at: today },
]

// ── Service Records ──────────────────────────────────────────
export const SERVICE_RECORDS: ServiceRecord[] = [
  { id: 'sr-1', task_id: TA(3), booking_id: BR(4), order_number: 'ORD-20260416-001', status: '已完成', care_unit_id: CU(2), passenger_id: PA(4), driver_id: DR(3), vehicle_id: VH(3), route: '去程A線', service_date: today, service_time: '08:00', pickup_address: '台中市北區中清路4號', dropoff_location: '頤養日照中心', actual_pickup_time: '08:05', actual_dropoff_time: '08:42', pickup_lat: 24.155, pickup_lng: 120.677, dropoff_lat: 24.162, dropoff_lng: 120.683, distance_km: 5.2, duration_minutes: 37, created_at: today },
]

// ── Dashboard Stats ──────────────────────────────────────────
export function getDashboardStats(): DashboardStats {
  return {
    today_trips: BOOKING_RECORDS.filter(b => b.service_date === today).length,
    completed_today: BOOKING_RECORDS.filter(b => b.service_date === today && b.status === '已完成').length,
    pending_assign: BOOKING_RECORDS.filter(b => b.status === '待指派').length,
    active_drivers: DRIVERS.filter(d => d.status === 'active').length,
    total_passengers: PASSENGERS.filter(p => p.status === 'active').length,
    completion_rate: 72,
  }
}
