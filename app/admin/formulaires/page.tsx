import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import FormulaireContent from './FormulaireContent'

export default async function FormulaireAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  // Candidatures : réservées au super admin
  const { data: profile } = await supabase.from('users').select('role, is_super_admin').eq('id', user.id).single()
  if (profile?.role !== 'admin' || !profile?.is_super_admin) redirect('/admin')

  const { data: candidatures } = await supabase
    .from('candidatures')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <FormulaireContent candidatures={candidatures ?? []} />
      </main>
    </>
  )
}
