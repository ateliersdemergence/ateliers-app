import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import ValidationContent from './ValidationContent'

export default async function ValidationAteliersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  // Validation des ateliers : réservée au super admin
  const { data: profile } = await supabase.from('users').select('role, is_super_admin').eq('id', user.id).single()
  if (profile?.role !== 'admin' || !profile?.is_super_admin) redirect('/admin')

  const { data: ateliers } = await supabase
    .from('ateliers')
    .select('id, title, description, date, start_time, end_time, theme, location, price, max_participants, created_at, users!ateliers_animateur_id_fkey(full_name, email)')
    .eq('status', 'pending')
    .eq('is_cancelled', false)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <ValidationContent ateliers={(ateliers ?? []) as unknown as PendingAtelier[]} />
      </main>
    </>
  )
}

export interface PendingAtelier {
  id: string
  title: string
  description: string | null
  date: string
  start_time: string
  end_time: string
  theme: 'travail' | 'detente'
  location: string | null
  price: number
  max_participants: number
  created_at: string
  users: { full_name: string; email: string } | null
}
