import Navbar from '@/components/layout/Navbar'
import PlanningView from './PlanningView'
import { createClient } from '@/lib/supabase/server'
import type { Indisponibilite } from '@/types'

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>
}) {
  const { paiement } = await searchParams
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
  let userPendingPayments: string[] = []
  let userRole: string | null = null
  let isSuperAdmin = false
  let indispos: Indisponibilite[] = []

  if (user) {
    const [{ data: reservations }, { data: profile }] = await Promise.all([
      supabase
        .from('reservations')
        .select('atelier_id, status, payment_expires_at')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'pending_payment']),
      supabase
        .from('users')
        .select('role, is_super_admin')
        .eq('id', user.id)
        .single(),
    ])
    const now = new Date()
    userReservations = reservations?.filter(r => r.status === 'confirmed').map(r => r.atelier_id) ?? []
    // Place bloquée pendant un paiement Stripe pas encore terminé
    userPendingPayments = reservations
      ?.filter(r => r.status === 'pending_payment' && r.payment_expires_at && new Date(r.payment_expires_at) > now)
      .map(r => r.atelier_id) ?? []
    userRole = profile?.role ?? null
    isSuperAdmin = profile?.is_super_admin ?? false

    // Indisponibilités de la salle : motif pour les admins, « Indisponible » pour les animateurs
    if (userRole === 'admin' || userRole === 'animateur') {
      const from = new Date()
      from.setDate(from.getDate() - 7)
      const to = new Date()
      to.setFullYear(to.getFullYear() + 1)
      const { data } = await supabase.rpc('indisponibilites_visibles', {
        p_from: from.toISOString().split('T')[0],
        p_to: to.toISOString().split('T')[0],
      })
      indispos = (data ?? []) as Indisponibilite[]
    }
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
          userPendingPayments={userPendingPayments}
          paymentNotice={paiement === 'annule' ? 'cancelled' : paiement === 'erreur' ? 'error' : null}
          isLoggedIn={!!user}
          userRole={userRole}
          userId={user?.id ?? null}
          indispos={indispos}
          isSuperAdmin={isSuperAdmin}
        />
      </main>
    </>
  )
}
