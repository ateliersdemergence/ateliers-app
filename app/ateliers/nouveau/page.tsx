import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import CreateAtelierForm from './CreateAtelierForm'

export default async function NouvelAtelierPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  // Jour choisi depuis le planning (yyyy-MM-dd), ignoré s'il est invalide ou passé
  const { date } = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const initialDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && date >= today ? date : ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'animateur'].includes(profile.role)) redirect('/planning')

  let animateurs: { id: string; full_name: string; email: string }[] = []
  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('role', ['animateur', 'admin'])
      .order('full_name')
    animateurs = data ?? []
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <CreateAtelierForm profile={profile} animateurs={animateurs} initialDate={initialDate} />
      </main>
    </>
  )
}
