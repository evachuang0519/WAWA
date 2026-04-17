import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function LinePage() {
  const session = await getSession()
  if (!session) redirect('/line/login')
  redirect('/line/tasks')
}
