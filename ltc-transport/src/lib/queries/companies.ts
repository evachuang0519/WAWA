import sql from '@/lib/pg'
import type { TransportCompany } from '@/types'

function toCompany(row: Record<string, unknown>): TransportCompany {
  return {
    id: String(row.id),
    name: String(row.name),
    short_name: row.short_name as string | undefined,
    address: row.address as string | undefined,
    phone: row.phone as string | undefined,
    contact_name: row.contact_name as string | undefined,
    contact_email: row.contact_email as string | undefined,
    license_no: row.license_no as string | undefined,
    service_areas: row.service_areas as string[] | undefined,
    status: (row.status as TransportCompany['status']) ?? 'active',
    created_at: String(row.created_at),
  }
}

export async function dbListCompanies(): Promise<TransportCompany[]> {
  const rows = await sql`SELECT * FROM transport_companies ORDER BY name`
  return rows.map(toCompany)
}

export async function dbFindCompany(id: string): Promise<TransportCompany | null> {
  const rows = await sql`SELECT * FROM transport_companies WHERE id = ${id}`
  return rows[0] ? toCompany(rows[0]) : null
}

export async function dbCreateCompany(data: Omit<TransportCompany, 'id' | 'created_at'>): Promise<TransportCompany> {
  const rows = await sql`
    INSERT INTO transport_companies (name, short_name, address, phone, contact_name, contact_email, license_no, status)
    VALUES (${data.name}, ${data.short_name ?? null}, ${data.address ?? null}, ${data.phone ?? null},
            ${data.contact_name ?? null}, ${data.contact_email ?? null}, ${data.license_no ?? null},
            ${data.status ?? 'active'})
    RETURNING *
  `
  return toCompany(rows[0])
}

export async function dbUpdateCompany(id: string, data: Partial<TransportCompany>): Promise<TransportCompany | null> {
  const rows = await sql`
    UPDATE transport_companies SET
      name          = COALESCE(${data.name ?? null}, name),
      short_name    = COALESCE(${data.short_name ?? null}, short_name),
      address       = COALESCE(${data.address ?? null}, address),
      phone         = COALESCE(${data.phone ?? null}, phone),
      contact_name  = COALESCE(${data.contact_name ?? null}, contact_name),
      contact_email = COALESCE(${data.contact_email ?? null}, contact_email),
      license_no    = COALESCE(${data.license_no ?? null}, license_no),
      status        = COALESCE(${data.status ?? null}::org_status, status),
      updated_at    = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0] ? toCompany(rows[0]) : null
}
