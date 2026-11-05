import { redirect } from 'next/navigation'
import type Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { confirmPaidSession, releasePendingSession } from '@/lib/stripe-reservations'

// Retour depuis le bouton « Retour » de la page Stripe : libère la place tout de suite
export default async function PaiementAnnulePage({
  searchParams,
}: {
  searchParams: Promise<{ reservation?: string }>
}) {
  const { reservation: reservationId } = await searchParams
  if (!reservationId) redirect('/planning')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  // La réservation doit appartenir à l'utilisateur connecté et être en attente
  const admin = createAdminClient()
  const { data: reservation } = await admin
    .from('reservations')
    .select('id, status, stripe_checkout_session_id')
    .eq('id', reservationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!reservation || reservation.status !== 'pending_payment' || !reservation.stripe_checkout_session_id) {
    redirect('/planning')
  }

  const stripe = getStripe()
  let session: Stripe.Checkout.Session | null = null
  try {
    session = await stripe.checkout.sessions.retrieve(reservation.stripe_checkout_session_id)
    // Expirer la session AVANT d'annuler : elle ne pourra plus être payée
    if (session.status === 'open') {
      session = await stripe.checkout.sessions.expire(session.id)
    }
  } catch (err) {
    // L'expiration échoue si le paiement vient d'aboutir : on relit la session
    console.error('[Stripe] annulation : expiration impossible', { reservationId, err: String(err) })
    session = await stripe.checkout.sessions.retrieve(reservation.stripe_checkout_session_id).catch(() => null)
  }

  // Payée entre-temps : on confirme au lieu d'annuler
  if (session?.payment_status === 'paid') {
    await confirmPaidSession(session, user.id)
    redirect(`/paiement/succes?session_id=${session.id}`)
  }

  if (session?.status === 'expired') {
    await releasePendingSession(session).catch(() => {})
    redirect('/planning?paiement=annule')
  }

  // Session illisible : la place sera libérée par le webhook « expired » ou à l'expiration du blocage
  redirect('/planning?paiement=erreur')
}
