import postgres from 'postgres'

// Connection singleton — reused across hot-reloads in dev
const globalForPg = globalThis as typeof globalThis & { _pg?: ReturnType<typeof postgres> }

export const sql = globalForPg._pg ?? postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: { undefined: null },
})

if (process.env.NODE_ENV !== 'production') globalForPg._pg = sql

export default sql
