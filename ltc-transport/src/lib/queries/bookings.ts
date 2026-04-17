import sql from '@/lib/pg'
import type { BookingRecord, Passenger, CareUnit, Vehicle } from '@/types'

export type EnrichedBooking = BookingRecord & {
  assigned_vehicle_id?: string
  assigned_driver_id?: string
  vehicle?: Vehicle
}

function toDateStr(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).split('T')[0]
}

function toEnrichedBooking(row: Record<string, unknown>): EnrichedBooking {
  const base: EnrichedBooking = {
    id: String(row.id),
    care_unit_id: String(row.care_unit_id),
    passenger_id: String(row.passenger_id),
    booking_date: toDateStr(row.booking_date),
    service_date: toDateStr(row.service_date),
    service_time: row.service_time as string | undefined,
    direction: row.direction as BookingRecord['direction'],
    pickup_address: row.pickup_address as string | undefined,
    dropoff_address: row.dropoff_address as string | undefined,
    wheelchair: Boolean(row.wheelchair),
    notes: row.notes as string | undefined,
    status: row.status as BookingRecord['status'],
    batch_id: row.batch_id as string | undefined,
    created_at: toDateStr(row.created_at),
  }

  if (row.p_id) {
    base.passenger = {
      id: String(row.p_id),
      care_unit_id: String(row.care_unit_id),
      name: String(row.p_name ?? ''),
      phone: row.p_phone as string | undefined,
      emergency_contact: row.p_emergency_contact as string | undefined,
      emergency_phone: row.p_emergency_phone as string | undefined,
      home_address: row.p_home_address as string | undefined,
      pickup_address: row.p_pickup_address as string | undefined,
      dropoff_address: row.p_dropoff_address as string | undefined,
      wheelchair: Boolean(row.p_wheelchair),
      disability_level: row.p_disability_level as string | undefined,
      status: (row.p_status as Passenger['status']) ?? 'active',
    }
  }

  if (row.cu_id) {
    base.care_unit = {
      id: String(row.cu_id),
      name: String(row.cu_name ?? ''),
      short_name: row.cu_short_name as string | undefined,
      phone: row.cu_phone as string | undefined,
      address: row.cu_address as string | undefined,
      contact_name: row.cu_contact_name as string | undefined,
      region: row.cu_region as string | undefined,
      status: (row.cu_status as CareUnit['status']) ?? 'active',
      created_at: toDateStr(row.cu_created_at) || '',
    }
  }

  if (row.assigned_vehicle_id) {
    base.assigned_vehicle_id = String(row.assigned_vehicle_id)
    base.assigned_driver_id  = row.assigned_driver_id ? String(row.assigned_driver_id) : undefined
    if (row.v_id) {
      base.vehicle = {
        id: String(row.v_id),
        company_id: String(row.v_company_id ?? ''),
        plate_number: String(row.v_plate ?? ''),
        type: (row.v_type as Vehicle['type']) ?? 'van',
        capacity: Number(row.v_capacity ?? 4),
        wheelchair_slots: Number(row.v_wheelchair_slots ?? 0),
        brand: row.v_brand as string | undefined,
        model: row.v_model as string | undefined,
        status: (row.v_status as Vehicle['status']) ?? 'available',
      }
    }
  }

  return base
}

// ── LIST ──────────────────────────────────────────────────────
export async function dbListBookings(
  status?: string,
  startDate?: string,
  endDate?: string,
  driverId?: string,
  limit = 100,
  offset = 0,
  careUnitId?: string,  // org_admin 範圍限制
  companyId?: string,   // fleet_admin 範圍限制（只看自己車行的指派 + 待指派）
): Promise<EnrichedBooking[]> {
  const rows = await sql`
    SELECT
      br.*,
      p.id               AS p_id,
      p.name             AS p_name,
      p.phone            AS p_phone,
      p.emergency_contact AS p_emergency_contact,
      p.emergency_phone  AS p_emergency_phone,
      p.home_address     AS p_home_address,
      p.pickup_address   AS p_pickup_address,
      p.dropoff_address  AS p_dropoff_address,
      p.wheelchair       AS p_wheelchair,
      p.disability_level AS p_disability_level,
      p.status           AS p_status,
      cu.id              AS cu_id,
      cu.name            AS cu_name,
      cu.short_name      AS cu_short_name,
      cu.phone           AS cu_phone,
      cu.address         AS cu_address,
      cu.contact_name    AS cu_contact_name,
      cu.region          AS cu_region,
      cu.status          AS cu_status,
      cu.created_at      AS cu_created_at,
      ta.driver_id       AS assigned_driver_id,
      ta.vehicle_id      AS assigned_vehicle_id,
      v.id               AS v_id,
      v.company_id       AS v_company_id,
      v.plate_number     AS v_plate,
      v.type             AS v_type,
      v.capacity         AS v_capacity,
      v.wheelchair_slots AS v_wheelchair_slots,
      v.brand            AS v_brand,
      v.model            AS v_model,
      v.status           AS v_status
    FROM booking_records br
    LEFT JOIN passengers p          ON p.id  = br.passenger_id
    LEFT JOIN care_units cu         ON cu.id = br.care_unit_id
    LEFT JOIN task_assignments ta   ON ta.booking_id = br.id
    LEFT JOIN vehicles v            ON v.id  = ta.vehicle_id
    WHERE TRUE
      ${careUnitId                ? sql`AND br.care_unit_id = ${careUnitId}` : sql``}
      ${companyId                 ? sql`AND (br.status = '待指派' OR v.company_id = ${companyId})` : sql``}
      ${driverId                  ? sql`AND ta.driver_id = ${driverId}` : sql``}
      ${status && status !== '全部' ? sql`AND br.status = ${status}::booking_status` : sql``}
      ${startDate                 ? sql`AND br.service_date >= ${startDate}` : sql``}
      ${endDate                   ? sql`AND br.service_date <= ${endDate}` : sql``}
    ORDER BY br.service_date DESC, br.service_time NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `
  return rows.map(toEnrichedBooking)
}

// ── COUNT（for pagination） ────────────────────────────────────
export async function dbCountBookings(
  status?: string,
  startDate?: string,
  endDate?: string,
  driverId?: string,
  careUnitId?: string,
  companyId?: string,
): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*) AS total
    FROM booking_records br
    LEFT JOIN task_assignments ta ON ta.booking_id = br.id
    LEFT JOIN vehicles v          ON v.id = ta.vehicle_id
    WHERE TRUE
      ${careUnitId                ? sql`AND br.care_unit_id = ${careUnitId}` : sql``}
      ${companyId                 ? sql`AND (br.status = '待指派' OR v.company_id = ${companyId})` : sql``}
      ${driverId                  ? sql`AND ta.driver_id = ${driverId}` : sql``}
      ${status && status !== '全部' ? sql`AND br.status = ${status}::booking_status` : sql``}
      ${startDate                 ? sql`AND br.service_date >= ${startDate}` : sql``}
      ${endDate                   ? sql`AND br.service_date <= ${endDate}` : sql``}
  `
  return Number(rows[0]?.total ?? 0)
}

export async function dbFindBooking(id: string): Promise<EnrichedBooking | null> {
  const rows = await sql`
    SELECT
      br.*,
      p.id               AS p_id,
      p.name             AS p_name,
      p.phone            AS p_phone,
      p.emergency_contact AS p_emergency_contact,
      p.emergency_phone  AS p_emergency_phone,
      p.home_address     AS p_home_address,
      p.pickup_address   AS p_pickup_address,
      p.dropoff_address  AS p_dropoff_address,
      p.wheelchair       AS p_wheelchair,
      p.disability_level AS p_disability_level,
      p.status           AS p_status,
      cu.id              AS cu_id,
      cu.name            AS cu_name,
      cu.short_name      AS cu_short_name,
      cu.phone           AS cu_phone,
      cu.address         AS cu_address,
      cu.contact_name    AS cu_contact_name,
      cu.region          AS cu_region,
      cu.status          AS cu_status,
      cu.created_at      AS cu_created_at,
      ta.driver_id       AS assigned_driver_id,
      ta.vehicle_id      AS assigned_vehicle_id,
      v.id               AS v_id,
      v.company_id       AS v_company_id,
      v.plate_number     AS v_plate,
      v.type             AS v_type,
      v.capacity         AS v_capacity,
      v.wheelchair_slots AS v_wheelchair_slots,
      v.brand            AS v_brand,
      v.model            AS v_model,
      v.status           AS v_status
    FROM booking_records br
    LEFT JOIN passengers p          ON p.id  = br.passenger_id
    LEFT JOIN care_units cu         ON cu.id = br.care_unit_id
    LEFT JOIN task_assignments ta   ON ta.booking_id = br.id
    LEFT JOIN vehicles v            ON v.id  = ta.vehicle_id
    WHERE br.id = ${id}
  `
  return rows[0] ? toEnrichedBooking(rows[0]) : null
}

export async function dbCreateBooking(
  data: Omit<BookingRecord, 'id' | 'created_at' | 'status' | 'booking_date'>
): Promise<BookingRecord> {
  const rows = await sql`
    INSERT INTO booking_records
      (care_unit_id, passenger_id, service_date, service_time, direction,
       pickup_address, dropoff_address, wheelchair, notes, batch_id)
    VALUES
      (${data.care_unit_id}, ${data.passenger_id}, ${data.service_date},
       ${data.service_time ?? null}, ${data.direction},
       ${data.pickup_address ?? null}, ${data.dropoff_address ?? null},
       ${data.wheelchair}, ${data.notes ?? null}, ${data.batch_id ?? null})
    RETURNING *
  `
  return rows[0] as BookingRecord
}

export async function dbUpdateBooking(
  id: string,
  patch: Partial<BookingRecord>
): Promise<BookingRecord | null> {
  const rows = await sql`
    UPDATE booking_records SET
      service_date    = COALESCE(${patch.service_date ?? null}, service_date),
      service_time    = COALESCE(${patch.service_time ?? null}, service_time),
      direction       = COALESCE(${patch.direction ?? null}::direction_type, direction),
      pickup_address  = COALESCE(${patch.pickup_address ?? null}, pickup_address),
      dropoff_address = COALESCE(${patch.dropoff_address ?? null}, dropoff_address),
      wheelchair      = COALESCE(${patch.wheelchair ?? null}, wheelchair),
      notes           = COALESCE(${patch.notes ?? null}, notes),
      status          = COALESCE(${patch.status ?? null}::booking_status, status),
      updated_at      = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0] ? (rows[0] as BookingRecord) : null
}

export async function dbCancelBooking(id: string): Promise<BookingRecord | null> {
  const rows = await sql`
    UPDATE booking_records SET status = '取消', updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0] ? (rows[0] as BookingRecord) : null
}
