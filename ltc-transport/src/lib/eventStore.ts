// In-memory GPS event log (survives server restarts via module cache)
export interface GpsEvent {
  [key: string]: unknown
  id: string
  booking_id: string
  event_type: 'arrived' | 'started' | 'completed' | 'cancelled'
  lat?: number
  lng?: number
  accuracy?: number
  timestamp: string
  driver_id?: string
  note?: string
}

const store: GpsEvent[] = []

export const eventStore = {
  add(evt: Omit<GpsEvent, 'id' | 'timestamp'>): GpsEvent {
    const e = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...evt,
    } as GpsEvent
    store.push(e)
    return e
  },
  list(bookingId: string): GpsEvent[] {
    return store.filter(e => e.booking_id === bookingId)
  },
  all(): GpsEvent[] {
    return [...store]
  },
}
