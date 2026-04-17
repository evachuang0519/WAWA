import sql from '@/lib/pg'
import type { CareUnit } from '@/types'

function toCareUnit(row: Record<string, unknown>): CareUnit {
  return {
    id: String(row.id),
    name: String(row.name),
    short_name: row.short_name as string | undefined,
    address: row.address as string | undefined,
    phone: row.phone as string | undefined,
    contact_name: row.contact_name as string | undefined,
    contact_email: row.contact_email as string | undefined,
    region: row.region as string | undefined,
    status: (row.status as CareUnit['status']) ?? 'active',
    created_at: String(row.created_at),
  }
}

export async function dbListCareUnits(): Promise<CareUnit[]> {
  const rows = await sql`SELECT * FROM care_units ORDER BY name`
  return rows.map(toCareUnit)
}

export async function dbFindCareUnit(id: string): Promise<CareUnit | null> {
  const rows = await sql`SELECT * FROM care_units WHERE id = ${id}`
  return rows[0] ? toCareUnit(rows[0]) : null
}

export async function dbCreateCareUnit(data: Omit<CareUnit, 'id' | 'created_at'>): Promise<CareUnit> {
  const rows = await sql`
    INSERT INTO care_units (name, short_name, address, phone, contact_name, contact_email, region, status)
    VALUES (${data.name}, ${data.short_name ?? null}, ${data.address ?? null}, ${data.phone ?? null},
            ${data.contact_name ?? null}, ${data.contact_email ?? null}, ${data.region ?? null},
            ${data.status ?? 'active'})
    RETURNING *
  `
  return toCareUnit(rows[0])
}

export async function dbUpdateCareUnit(id: string, data: Partial<CareUnit>): Promise<CareUnit | null> {
  const rows = await sql`
    UPDATE care_units SET
      name          = COALESCE(${data.name ?? null}, name),
      short_name    = COALESCE(${data.short_name ?? null}, short_name),
      address       = COALESCE(${data.address ?? null}, address),
      phone         = COALESCE(${data.phone ?? null}, phone),
      contact_name  = COALESCE(${data.contact_name ?? null}, contact_name),
      contact_email = COALESCE(${data.contact_email ?? null}, contact_email),
      region        = COALESCE(${data.region ?? null}, region),
      status        = COALESCE(${data.status ?? null}::org_status, status),
      updated_at    = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0] ? toCareUnit(rows[0]) : null
}
