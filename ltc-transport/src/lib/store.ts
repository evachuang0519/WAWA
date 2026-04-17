// ============================================================
// 可變動記憶體資料庫 (seeded from mock data, survives hot-reload)
// Replace with real DB calls when connecting Supabase/PostgreSQL
// ============================================================
import { BOOKING_RECORDS } from './db'
import type { BookingRecord } from '@/types'

function genId(prefix = 'br') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// Node module cache keeps this alive across requests in the same process
const _bookings: BookingRecord[] = [...BOOKING_RECORDS]

export const bookingStore = {
  list(): BookingRecord[] {
    return [..._bookings].sort((a, b) =>
      a.service_date.localeCompare(b.service_date) ||
      (a.service_time ?? '').localeCompare(b.service_time ?? '')
    )
  },

  find(id: string): BookingRecord | undefined {
    return _bookings.find(b => b.id === id)
  },

  create(data: Omit<BookingRecord, 'id' | 'created_at' | 'status'>): BookingRecord {
    const today = new Date().toISOString().split('T')[0]
    const booking: BookingRecord = {
      ...data,
      id: genId(),
      status: '待指派',
      booking_date: today,
      created_at: today,
    }
    _bookings.push(booking)
    return booking
  },

  update(id: string, patch: Partial<BookingRecord>): BookingRecord | null {
    const idx = _bookings.findIndex(b => b.id === id)
    if (idx === -1) return null
    _bookings[idx] = { ..._bookings[idx], ...patch }
    return _bookings[idx]
  },

  cancel(id: string): BookingRecord | null {
    return this.update(id, { status: '取消' })
  },
}
