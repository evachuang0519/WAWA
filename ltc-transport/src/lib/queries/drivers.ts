import sql from '@/lib/pg'
import type { Driver } from '@/types'

function toDriver(row: Record<string, unknown>): Driver {
  return {
    id: String(row.id),
    company_id: String(row.company_id),
    user_id: row.user_id ? String(row.user_id) : undefined,
    name: String(row.name),
    phone: row.phone as string | undefined,
    id_number: row.id_number as string | undefined,
    license_number: row.license_number as string | undefined,
    license_class: row.license_class as string | undefined,
    license_expiry: row.license_expiry ? (row.license_expiry instanceof Date ? row.license_expiry.toISOString().split('T')[0] : String(row.license_expiry).split('T')[0]) : undefined,
    health_cert_expiry: row.health_cert_expiry ? (row.health_cert_expiry instanceof Date ? row.health_cert_expiry.toISOString().split('T')[0] : String(row.health_cert_expiry).split('T')[0]) : undefined,
    status: (row.status as Driver['status']) ?? 'active',
    notes: row.notes as string | undefined,
  }
}

export async function dbFindDriverByUserId(userId: string): Promise<Driver | null> {
  const rows = await sql`SELECT * FROM drivers WHERE user_id = ${userId} LIMIT 1`
  return rows[0] ? toDriver(rows[0]) : null
}

export async function dbListDrivers(companyId?: string): Promise<Driver[]> {
  const rows = companyId
    ? await sql`SELECT * FROM drivers WHERE company_id = ${companyId} ORDER BY name`
    : await sql`SELECT * FROM drivers ORDER BY name`
  return rows.map(toDriver)
}

export async function dbCreateDriver(data: Omit<Driver, 'id'>): Promise<Driver> {
  const rows = await sql`
    INSERT INTO drivers
      (company_id, user_id, name, phone, id_number, license_number, license_class,
       license_expiry, health_cert_expiry, status, notes)
    VALUES
      (${data.company_id}, ${data.user_id ?? null}, ${data.name}, ${data.phone ?? null},
       ${data.id_number ?? null}, ${data.license_number ?? null}, ${data.license_class ?? null},
       ${data.license_expiry ?? null}, ${data.health_cert_expiry ?? null},
       ${data.status ?? 'active'}, ${data.notes ?? null})
    RETURNING *
  `
  return toDriver(rows[0])
}

export async function dbUpdateDriver(id: string, data: Partial<Driver>): Promise<Driver | null> {
  const rows = await sql`
    UPDATE drivers SET
      name               = COALESCE(${data.name ?? null}, name),
      phone              = COALESCE(${data.phone ?? null}, phone),
      license_number     = COALESCE(${data.license_number ?? null}, license_number),
      license_class      = COALESCE(${data.license_class ?? null}, license_class),
      license_expiry     = COALESCE(${data.license_expiry ?? null}, license_expiry),
      health_cert_expiry = COALESCE(${data.health_cert_expiry ?? null}, health_cert_expiry),
      status             = COALESCE(${data.status ?? null}::driver_status, status),
      notes              = COALESCE(${data.notes ?? null}, notes),
      updated_at         = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0] ? toDriver(rows[0]) : null
}
