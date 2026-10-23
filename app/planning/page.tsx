import Navbar from '@/components/layout/Navbar'
import PlanningView from './PlanningView'
import { createClient } from '@/lib/supabase/server'

export default async function PlanningPage() {
  const supabase = await createClient()

  const { data: ateliers } = await supabase
    .from('ateliers_with_spots')
    .select('*, users!ateliers_animateur_id_fkey(full_name, email)')
    .or('is_cancelled.eq.false,is_cancelled.is.null')
    // Seuls les ateliers validés par le super admin sont publiés
    .eq('status', 'approved')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  let userReservations: string[] = []
  let userRole: string | null = null

  if (user) {
    const [{ data: reservations }, { data: profile }] = await Promise.all([
      supabase
        .from('reservations')
        .select('atelier_id')
        .eq('user_id', user.id)
        .eq('status', 'confirmed'),
      supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single(),
    ])
    userReservations = reservations?.map(r => r.atelier_id) ?? []
    userRole = profile?.role ?? null
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Planning des ateliers</h1>
          <p className="text-[var(--muted)] mt-1">Réservez votre place pour les prochains ateliers de la semaine</p>
        </div>
        <PlanningView
          ateliers={ateliers ?? []}
          userReservations={userReservations}
          isLoggedIn={!!user}
          userRole={userRole}
          userId={user?.id ?? null}
        />
      </main>
    </>
  )
}
