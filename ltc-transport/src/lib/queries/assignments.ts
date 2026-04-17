import sql from '@/lib/pg'
import type { TaskAssignment } from '@/types'

function toAssignment(row: Record<string, unknown>): TaskAssignment {
  return {
    id: String(row.id),
    booking_id: String(row.booking_id),
    driver_id: String(row.driver_id),
    vehicle_id: String(row.vehicle_id),
    assigned_by: row.assigned_by ? String(row.assigned_by) : undefined,
    assigned_at: String(row.assigned_at ?? '').split('T')[0],
    notes: row.notes as string | undefined,
  }
}

export async function dbListAssignments(companyId?: string): Promise<TaskAssignment[]> {
  const rows = companyId
    ? await sql`
        SELECT ta.* FROM task_assignments ta
        JOIN drivers d ON d.id = ta.driver_id
        WHERE d.company_id = ${companyId}
        ORDER BY ta.assigned_at DESC
      `
    : await sql`SELECT * FROM task_assignments ORDER BY assigned_at DESC`
  return rows.map(toAssignment)
}

export async function dbFindAssignmentByBooking(bookingId: string): Promise<TaskAssignment | null> {
  const rows = await sql`SELECT * FROM task_assignments WHERE booking_id = ${bookingId} LIMIT 1`
  return rows[0] ? toAssignment(rows[0]) : null
}

export async function dbCreateAssignment(data: {
  booking_id: string
  driver_id: string
  vehicle_id: string
  notes?: string
}): Promise<TaskAssignment> {
  // Check for existing assignment (no unique constraint on booking_id)
  const existing = await dbFindAssignmentByBooking(data.booking_id)
  if (existing) {
    const rows = await sql`
      UPDATE task_assignments SET
        driver_id = ${data.driver_id},
        vehicle_id = ${data.vehicle_id},
        notes = ${data.notes ?? null},
        assigned_at = NOW()
      WHERE booking_id = ${data.booking_id}
      RETURNING *
    `
    return toAssignment(rows[0])
  }
  const rows = await sql`
    INSERT INTO task_assignments (booking_id, driver_id, vehicle_id, notes)
    VALUES (${data.booking_id}, ${data.driver_id}, ${data.vehicle_id}, ${data.notes ?? null})
    RETURNING *
  `
  return toAssignment(rows[0])
}

export async function dbDeleteAssignment(bookingId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM task_assignments WHERE booking_id = ${bookingId} RETURNING id
  `
  return rows.length > 0
}
