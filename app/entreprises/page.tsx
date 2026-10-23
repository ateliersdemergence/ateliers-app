import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import EntreprisesPublicContent from './EntreprisesPublicContent'

export default async function EntreprisesPage() {
  const supabase = await createClient()

  // Pas d'email ni de téléphone : cette page est publique
  const [{ data: entreprises }, { data: intervenants }] = await Promise.all([
    supabase.from('entreprises').select('*').order('name'),
    supabase
      .from('users')
      .select('id, full_name, avatar_url, bio, role, organisme')
      .in('role', ['animateur', 'admin'])
      .order('full_name'),
  ])

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <EntreprisesPublicContent
          entreprises={entreprises ?? []}
          intervenants={intervenants ?? []}
        />
      </main>
    </>
  )
}
