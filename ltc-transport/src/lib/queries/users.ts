import sql from '@/lib/pg'
import type { User, UserRole } from '@/types'
import { hashPassword } from '@/lib/auth'

function toUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as UserRole,
    org_id: row.org_id ? String(row.org_id) : undefined,
    org_type: row.org_type as User['org_type'] | undefined,
    status: (row.status as User['status']) ?? 'active',
    avatar_url: row.avatar_url as string | undefined,
    last_login: row.last_login ? String(row.last_login) : undefined,
    created_at: String(row.created_at),
  }
}

export async function dbFindUserByEmail(email: string): Promise<(User & { password_hash: string; line_user_id?: string }) | null> {
  const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`
  if (!rows[0]) return null
  return { ...toUser(rows[0]), password_hash: String(rows[0].password_hash), line_user_id: rows[0].line_user_id as string | undefined }
}

export async function dbFindUserByLineId(lineUserId: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE line_user_id = ${lineUserId} LIMIT 1`
  return rows[0] ? toUser(rows[0]) : null
}

export async function dbCreateUser(data: {
  name: string
  email: string
  password?: string
  role: UserRole
  org_id?: string
  org_type?: string
  line_user_id?: string
  line_picture_url?: string
  status?: User['status']
}): Promise<User> {
  const password_hash = data.password
    ? await hashPassword(data.password)
    : await hashPassword(Math.random().toString(36)) // random hash if no password (LINE-only user)

  const rows = await sql`
    INSERT INTO users (name, email, password_hash, role, org_id, org_type, line_user_id, avatar_url, status)
    VALUES (
      ${data.name},
      ${data.email},
      ${password_hash},
      ${data.role},
      ${data.org_id ?? null},
      ${data.org_type ?? null},
      ${data.line_user_id ?? null},
      ${data.line_picture_url ?? null},
      ${data.status ?? 'active'}
    )
    RETURNING *
  `
  return toUser(rows[0])
}

export async function dbUpdateUserLastLogin(id: string): Promise<void> {
  await sql`UPDATE users SET last_login = NOW() WHERE id = ${id}`
}

export async function dbLinkLineId(userId: string, lineUserId: string, picUrl?: string): Promise<void> {
  await sql`
    UPDATE users SET line_user_id = ${lineUserId}, avatar_url = COALESCE(${picUrl ?? null}, avatar_url)
    WHERE id = ${userId}
  `
}
