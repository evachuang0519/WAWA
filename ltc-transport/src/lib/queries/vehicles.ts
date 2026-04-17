import sql from '@/lib/pg'
import type { Vehicle } from '@/types'

function toVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id: String(row.id),
    company_id: String(row.company_id),
    plate_number: String(row.plate_number),
    type: (row.type as Vehicle['type']) ?? 'van',
    capacity: Number(row.capacity) ?? 4,
    wheelchair_slots: Number(row.wheelchair_slots) ?? 0,
    year: row.year ? Number(row.year) : undefined,
    brand: row.brand as string | undefined,
    model: row.model as string | undefined,
    insurance_expiry: row.insurance_expiry ? (row.insurance_expiry instanceof Date ? row.insurance_expiry.toISOString().split('T')[0] : String(row.insurance_expiry).split('T')[0]) : undefined,
    inspection_due: row.inspection_due ? (row.inspection_due instanceof Date ? row.inspection_due.toISOString().split('T')[0] : String(row.inspection_due).split('T')[0]) : undefined,
    status: (row.status as Vehicle['status']) ?? 'available',
    notes: row.notes as string | undefined,
  }
}

export async function dbListVehicles(companyId?: string): Promise<Vehicle[]> {
  const rows = companyId
    ? await sql`SELECT * FROM vehicles WHERE company_id = ${companyId} ORDER BY plate_number`
    : await sql`SELECT * FROM vehicles ORDER BY plate_number`
  return rows.map(toVehicle)
}

export async function dbCreateVehicle(data: Omit<Vehicle, 'id'>): Promise<Vehicle> {
  const rows = await sql`
    INSERT INTO vehicles
      (company_id, plate_number, type, capacity, wheelchair_slots, year, brand, model,
       insurance_expiry, inspection_due, status, notes)
    VALUES
      (${data.company_id}, ${data.plate_number}, ${data.type}, ${data.capacity},
       ${data.wheelchair_slots}, ${data.year ?? null}, ${data.brand ?? null}, ${data.model ?? null},
       ${data.insurance_expiry ?? null}, ${data.inspection_due ?? null},
       ${data.status ?? 'available'}, ${data.notes ?? null})
    RETURNING *
  `
  return toVehicle(rows[0])
}

export async function dbUpdateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle | null> {
  const rows = await sql`
    UPDATE vehicles SET
      plate_number     = COALESCE(${data.plate_number ?? null}, plate_number),
      type             = COALESCE(${data.type ?? null}::vehicle_type, type),
      capacity         = COALESCE(${data.capacity ?? null}, capacity),
      wheelchair_slots = COALESCE(${data.wheelchair_slots ?? null}, wheelchair_slots),
      brand            = COALESCE(${data.brand ?? null}, brand),
      model            = COALESCE(${data.model ?? null}, model),
      insurance_expiry = COALESCE(${data.insurance_expiry ?? null}, insurance_expiry),
      inspection_due   = COALESCE(${data.inspection_due ?? null}, inspection_due),
      status           = COALESCE(${data.status ?? null}::vehicle_status, status),
      notes            = COALESCE(${data.notes ?? null}, notes),
      updated_at       = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0] ? toVehicle(rows[0]) : null
}
