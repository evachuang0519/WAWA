// ============================================================
// 系統核心型別定義
// ============================================================

export type UserRole = 'system_admin' | 'org_admin' | 'fleet_admin' | 'driver' | 'viewer'
export type UserStatus = 'active' | 'suspended' | 'pending'
export type BookingStatus = '待指派' | '已指派' | '進行中' | '已完成' | '請假' | '取消'
export type ServiceStatus = '預約' | '已完成' | '請假' | '取消'
export type Direction = '去程' | '返程'
export type VehicleType = 'sedan' | 'van' | 'wheelchair_van' | 'bus'
export type VehicleStatus = 'available' | 'in_service' | 'maintenance' | 'retired'
export type DriverStatus = 'active' | 'leave' | 'resigned'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  org_id?: string
  org_type?: 'care_unit' | 'transport_company'
  status: UserStatus
  avatar_url?: string
  last_login?: string
  created_at: string
}

export interface CareUnit {
  id: string
  name: string
  short_name?: string
  address?: string
  phone?: string
  contact_name?: string
  contact_email?: string
  region?: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface TransportCompany {
  id: string
  name: string
  short_name?: string
  address?: string
  phone?: string
  contact_name?: string
  contact_email?: string
  license_no?: string
  service_areas?: string[]
  status: 'active' | 'inactive'
  created_at: string
}

export interface Vehicle {
  id: string
  company_id: string
  company?: TransportCompany
  plate_number: string
  type: VehicleType
  capacity: number
  wheelchair_slots: number
  year?: number
  brand?: string
  model?: string
  insurance_expiry?: string
  inspection_due?: string
  status: VehicleStatus
  notes?: string
}

export interface Driver {
  id: string
  company_id: string
  company?: TransportCompany
  user_id?: string
  name: string
  phone?: string
  id_number?: string
  license_number?: string
  license_class?: string
  license_expiry?: string
  health_cert_expiry?: string
  status: DriverStatus
  notes?: string
}

export interface Passenger {
  id: string
  care_unit_id: string
  care_unit?: CareUnit
  name: string
  id_number?: string
  phone?: string
  emergency_contact?: string
  emergency_phone?: string
  home_address?: string
  pickup_address?: string
  dropoff_address?: string
  wheelchair: boolean
  disability_level?: string
  notes?: string
  status: 'active' | 'suspended' | 'discharged'
}

export interface BookingRecord {
  id: string
  care_unit_id: string
  care_unit?: CareUnit
  passenger_id: string
  passenger?: Passenger
  booking_date: string
  service_date: string
  service_time?: string
  direction: Direction
  pickup_address?: string
  dropoff_address?: string
  wheelchair: boolean
  recurrence_rule?: string
  batch_id?: string
  notes?: string
  status: BookingStatus
  created_by?: string
  created_at: string
  task_assignment?: TaskAssignment
}

export interface TaskAssignment {
  id: string
  booking_id: string
  booking?: BookingRecord
  driver_id: string
  driver?: Driver
  vehicle_id: string
  vehicle?: Vehicle
  route_id?: string
  assigned_by?: string
  assigned_at: string
  notes?: string
}

export interface ServiceRecord {
  id: string
  task_id?: string
  booking_id?: string
  order_number: string
  status: ServiceStatus
  care_unit_id?: string
  care_unit?: CareUnit
  passenger_id?: string
  passenger?: Passenger
  driver_id?: string
  driver?: Driver
  vehicle_id?: string
  vehicle?: Vehicle
  route?: string
  service_date?: string
  service_time?: string
  pickup_address?: string
  dropoff_location?: string
  actual_pickup_time?: string
  actual_dropoff_time?: string
  pickup_lat?: number
  pickup_lng?: number
  dropoff_lat?: number
  dropoff_lng?: number
  distance_km?: number
  duration_minutes?: number
  signature_url?: string
  notes?: string
  created_at: string
}

// Dashboard stats
export interface DashboardStats {
  today_trips: number
  completed_today: number
  pending_assign: number
  active_drivers: number
  total_passengers: number
  completion_rate: number
}

// Auth
export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  org_id?: string
  org_type?: string
}

export interface LoginPayload {
  email: string
  password: string
}

// API response wrapper
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// ── 週期排班範本 ──────────────────────────────────────────────
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0=週日, 1=週一, …, 6=週六

export interface RecurringTemplate {
  id: string
  care_unit_id: string
  care_unit?: CareUnit
  passenger_id: string
  passenger?: Passenger
  day_of_week: DayOfWeek
  service_time: string          // HH:mm
  pickup_address?: string
  dropoff_address?: string
  wheelchair: boolean
  direction: Direction
  notes?: string
  is_active: boolean
  created_by?: string
  created_at: string
}
