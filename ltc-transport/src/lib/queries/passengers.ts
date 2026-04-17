import sql from '@/lib/pg'
import type { Passenger } from '@/types'

function toPassenger(row: Record<string, unknown>): Passenger {
  return {
    id: String(row.id),
    care_unit_id: String(row.care_unit_id),
    name: String(row.name),
    id_number: row.id_number as string | undefined,
    phone: row.phone as string | undefined,
    emergency_contact: row.emergency_contact as string | undefined,
    emergency_phone: row.emergency_phone as string | undefined,
    home_address: row.home_address as string | undefined,
    pickup_address: row.pickup_address as string | undefined,
    dropoff_address: row.dropoff_address as string | undefined,
    wheelchair: Boolean(row.wheelchair),
    disability_level: row.disability_level as string | undefined,
    notes: row.notes as string | undefined,
    status: (row.status as Passenger['status']) ?? 'active',
  }
}

export async function dbListPassengers(careUnitId?: string): Promise<Passenger[]> {
  const rows = careUnitId
    ? await sql`SELECT * FROM passengers WHERE care_unit_id = ${careUnitId} ORDER BY name`
    : await sql`SELECT * FROM passengers ORDER BY name`
  return rows.map(toPassenger)
}

export async function dbFindPassenger(id: string): Promise<Passenger | null> {
  const rows = await sql`SELECT * FROM passengers WHERE id = ${id}`
  return rows[0] ? toPassenger(rows[0]) : null
}

export async function dbCreatePassenger(data: Omit<Passenger, 'id'>): Promise<Passenger> {
  const rows = await sql`
    INSERT INTO passengers
      (care_unit_id, name, id_number, phone, emergency_contact, emergency_phone,
       home_address, pickup_address, dropoff_address, wheelchair, disability_level, notes, status)
    VALUES
      (${data.care_unit_id}, ${data.name}, ${data.id_number ?? null}, ${data.phone ?? null},
       ${data.emergency_contact ?? null}, ${data.emergency_phone ?? null},
       ${data.home_address ?? null}, ${data.pickup_address ?? null}, ${data.dropoff_address ?? null},
       ${data.wheelchair}, ${data.disability_level ?? null}, ${data.notes ?? null},
       ${data.status ?? 'active'})
    RETURNING *
  `
  return toPassenger(rows[0])
}

export async function dbUpdatePassenger(id: string, data: Partial<Passenger>): Promise<Passenger | null> {
  const rows = await sql`
    UPDATE passengers SET
      care_unit_id       = COALESCE(${data.care_unit_id ?? null}, care_unit_id),
      name               = COALESCE(${data.name ?? null}, name),
      phone              = COALESCE(${data.phone ?? null}, phone),
      emergency_contact  = COALESCE(${data.emergency_contact ?? null}, emergency_contact),
      emergency_phone    = COALESCE(${data.emergency_phone ?? null}, emergency_phone),
      home_address       = COALESCE(${data.home_address ?? null}, home_address),
      pickup_address     = COALESCE(${data.pickup_address ?? null}, pickup_address),
      dropoff_address    = COALESCE(${data.dropoff_address ?? null}, dropoff_address),
      wheelchair         = COALESCE(${data.wheelchair ?? null}, wheelchair),
      notes              = COALESCE(${data.notes ?? null}, notes),
      status             = COALESCE(${data.status ?? null}::passenger_status, status),
      updated_at         = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0] ? toPassenger(rows[0]) : null
}
