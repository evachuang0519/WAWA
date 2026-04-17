import sql from '@/lib/pg'
import type { RecurringTemplate, Passenger, CareUnit, DayOfWeek } from '@/types'

// ── Row mapper ────────────────────────────────────────────────

function toTemplate(row: Record<string, unknown>): RecurringTemplate {
  const t: RecurringTemplate = {
    id: String(row.id),
    care_unit_id: String(row.care_unit_id),
    passenger_id: String(row.passenger_id),
    day_of_week: Number(row.day_of_week) as DayOfWeek,
    service_time: String(row.service_time ?? ''),
    pickup_address: row.pickup_address as string | undefined,
    dropoff_address: row.dropoff_address as string | undefined,
    wheelchair: Boolean(row.wheelchair),
    direction: (row.direction as RecurringTemplate['direction']) ?? '去程',
    notes: row.notes as string | undefined,
    is_active: Boolean(row.is_active),
    created_by: row.created_by as string | undefined,
    created_at: String(row.created_at ?? ''),
  }

  if (row.p_id) {
    t.passenger = {
      id: String(row.p_id),
      care_unit_id: String(row.care_unit_id),
      name: String(row.p_name ?? ''),
      phone: row.p_phone as string | undefined,
      pickup_address: row.p_pickup_address as string | undefined,
      dropoff_address: row.p_dropoff_address as string | undefined,
      wheelchair: Boolean(row.p_wheelchair),
      status: (row.p_status as Passenger['status']) ?? 'active',
    }
  }

  if (row.cu_id) {
    t.care_unit = {
      id: String(row.cu_id),
      name: String(row.cu_name ?? ''),
      short_name: row.cu_short_name as string | undefined,
      status: (row.cu_status as CareUnit['status']) ?? 'active',
      created_at: String(row.cu_created_at ?? ''),
    }
  }

  return t
}

const BASE_SELECT = sql`
  SELECT
    rt.*,
    p.id          AS p_id,
    p.name        AS p_name,
    p.phone       AS p_phone,
    p.pickup_address  AS p_pickup_address,
    p.dropoff_address AS p_dropoff_address,
    p.wheelchair  AS p_wheelchair,
    p.status      AS p_status,
    cu.id         AS cu_id,
    cu.name       AS cu_name,
    cu.short_name AS cu_short_name,
    cu.status     AS cu_status,
    cu.created_at AS cu_created_at
  FROM recurring_templates rt
  LEFT JOIN passengers p  ON p.id  = rt.passenger_id
  LEFT JOIN care_units cu ON cu.id = rt.care_unit_id
`

// ── DB queries ────────────────────────────────────────────────

export async function dbListTemplates(careUnitId?: string): Promise<RecurringTemplate[]> {
  const rows = careUnitId
    ? await sql`${BASE_SELECT} WHERE rt.care_unit_id = ${careUnitId} ORDER BY rt.day_of_week, rt.service_time`
    : await sql`${BASE_SELECT} ORDER BY rt.day_of_week, rt.service_time`
  return (rows as Record<string, unknown>[]).map(toTemplate)
}

export async function dbGetTemplate(id: string): Promise<RecurringTemplate | null> {
  const rows = await sql`${BASE_SELECT} WHERE rt.id = ${id} LIMIT 1`
  if (!rows.length) return null
  return toTemplate(rows[0] as Record<string, unknown>)
}

export async function dbCreateTemplate(
  data: Omit<RecurringTemplate, 'id' | 'created_at' | 'passenger' | 'care_unit'>,
): Promise<RecurringTemplate> {
  const [row] = await sql`
    INSERT INTO recurring_templates
      (care_unit_id, passenger_id, day_of_week, service_time,
       pickup_address, dropoff_address, wheelchair, direction,
       notes, is_active, created_by)
    VALUES
      (${data.care_unit_id}, ${data.passenger_id}, ${data.day_of_week}, ${data.service_time},
       ${data.pickup_address ?? null}, ${data.dropoff_address ?? null},
       ${data.wheelchair}, ${data.direction},
       ${data.notes ?? null}, ${data.is_active}, ${data.created_by ?? null})
    RETURNING *
  `
  const full = await dbGetTemplate(String((row as Record<string, unknown>).id))
  return full!
}

export async function dbUpdateTemplate(
  id: string,
  patch: Partial<Omit<RecurringTemplate, 'id' | 'created_at' | 'passenger' | 'care_unit'>>,
): Promise<RecurringTemplate | null> {
  await sql`
    UPDATE recurring_templates SET
      day_of_week     = COALESCE(${patch.day_of_week    ?? null}, day_of_week),
      service_time    = COALESCE(${patch.service_time   ?? null}, service_time),
      pickup_address  = COALESCE(${patch.pickup_address ?? null}, pickup_address),
      dropoff_address = COALESCE(${patch.dropoff_address ?? null}, dropoff_address),
      wheelchair      = COALESCE(${patch.wheelchair     ?? null}, wheelchair),
      direction       = COALESCE(${patch.direction      ?? null}::direction_type, direction),
      notes           = COALESCE(${patch.notes          ?? null}, notes),
      is_active       = COALESCE(${patch.is_active      ?? null}, is_active),
      updated_at      = NOW()
    WHERE id = ${id}
  `
  return dbGetTemplate(id)
}

export async function dbDeleteTemplate(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM recurring_templates WHERE id = ${id}`
  return result.count > 0
}
