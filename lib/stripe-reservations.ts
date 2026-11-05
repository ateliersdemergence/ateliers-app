import 'server-only'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Toutes les écritures passent par la clé service_role : protect_reservation_status
// réserve au serveur le statut pending_payment et les champs de paiement, et
// check_reservation_capacity n'autorise que le serveur à confirmer un paiement
// reçu juste après l'expiration du blocage.

export type ConfirmResult =
  | { ok: true; reservationId: string; atelierId: string }
  | { ok: false; reason: 'not_paid' | 'unknown_reservation' | 'mismatch' | 'db_error'; detail?: string }

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent
  if (!pi) return null
  return typeof pi === 'string' ? pi : pi.id
}

/**
 * Confirme la réservation liée à une session Checkout payée.
 * Idempotent : peut être appelé par le webhook ET par la page de succès.
 * `expectedUserId` : si fourni (page de succès), la session doit appartenir
 * à cet utilisateur.
 */
export async function confirmPaidSession(
  session: Stripe.Checkout.Session,
  expectedUserId?: string,
): Promise<ConfirmResult> {
  if (session.payment_status !== 'paid') return { ok: false, reason: 'not_paid' }

  const reservationId = session.metadata?.reservation_id ?? session.client_reference_id
  const userId = session.metadata?.user_id
  const atelierId = session.metadata?.atelier_id
  const expectedCents = Number(session.metadata?.amount_cents)
  const pi = paymentIntentId(session)

  if (!reservationId || !userId || !atelierId || !pi) {
    return { ok: false, reason: 'unknown_reservation' }
  }
  if (expectedUserId && expectedUserId !== userId) {
    return { ok: false, reason: 'mismatch', detail: 'session d’un autre utilisateur' }
  }

  const admin = createAdminClient()
  const { data: reservation } = await admin
    .from('reservations')
    .select('id, user_id, atelier_id, status, stripe_payment_intent_id')
    .eq('id', reservationId)
    .maybeSingle()

  if (!reservation) return { ok: false, reason: 'unknown_reservation' }
  if (reservation.user_id !== userId || reservation.atelier_id !== atelierId) {
    console.error('[Stripe] réservation incohérente', { sessionId: session.id, reservationId })
    return { ok: false, reason: 'mismatch', detail: 'réservation incohérente' }
  }

  // Déjà traité (webhook reçu deux fois, ou webhook + page de succès)
  if (reservation.status === 'confirmed' && reservation.stripe_payment_intent_id === pi) {
    return { ok: true, reservationId, atelierId }
  }

  // Montant : celui fixé par le serveur à la création de la session
  if (
    session.currency !== 'eur' ||
    !Number.isFinite(expectedCents) ||
    session.amount_total !== expectedCents
  ) {
    console.error('[Stripe] montant incorrect', {
      sessionId: session.id, reservationId, paid: session.amount_total, expected: expectedCents, currency: session.currency,
    })
    return { ok: false, reason: 'mismatch', detail: 'montant incorrect' }
  }

  // Déjà confirmée par un autre moyen : paiement en double, à rembourser
  if (reservation.status === 'confirmed') {
    console.error('[Stripe] réservation déjà confirmée, paiement en double à rembourser', {
      sessionId: session.id, reservationId, paymentIntent: pi,
    })
    return { ok: false, reason: 'mismatch', detail: 'réservation déjà confirmée' }
  }

  const { error } = await admin
    .from('reservations')
    .update({
      status: 'confirmed',
      payment_method: 'stripe',
      // payment_id reçoit aussi le pi_... : déclenche la notification « Paiement reçu »
      payment_id: pi,
      stripe_payment_intent_id: pi,
      stripe_checkout_session_id: session.id,
      payment_expires_at: null,
    })
    .eq('id', reservationId)

  if (error) {
    // Ex. : atelier complet alors que la réservation avait été annulée entre-temps.
    // Le client a payé sans place : remboursement manuel depuis Stripe.
    console.error('[Stripe] confirmation impossible, paiement à rembourser', {
      sessionId: session.id, reservationId, paymentIntent: pi, error: error.message,
    })
    return { ok: false, reason: 'db_error', detail: error.message }
  }

  return { ok: true, reservationId, atelierId }
}

/**
 * Libère la place d'une session expirée ou abandonnée.
 * Ne touche la réservation que si elle est encore en attente pour CETTE session.
 */
export async function releasePendingSession(session: Stripe.Checkout.Session): Promise<void> {
  const reservationId = session.metadata?.reservation_id ?? session.client_reference_id
  if (!reservationId) return

  const admin = createAdminClient()
  const { error } = await admin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)
    .eq('status', 'pending_payment')
    .eq('stripe_checkout_session_id', session.id)

  if (error) {
    console.error('[Stripe] libération de la place impossible', { sessionId: session.id, reservationId, error: error.message })
    throw new Error(error.message)
  }
}
