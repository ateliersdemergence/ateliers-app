import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, PAYMENT_HOLD_MINUTES, siteUrl, toCents } from '@/lib/stripe'
import { confirmPaidSession } from '@/lib/stripe-reservations'

type Reply =
  | { url: string }            // redirection vers Stripe (ou page de succès)
  | { confirmed: true }        // réinscription sans paiement
  | { error: string }

function reply(body: Reply, status = 200) {
  return NextResponse.json(body, { status })
}

function dbMessage(message: string): string {
  if (message.includes('Atelier complet')) return 'Cet atelier est complet. Vous pouvez vous inscrire en liste d’attente.'
  return 'La réservation n’a pas pu être enregistrée. Réessayez dans un instant.'
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { atelierId?: unknown } | null
  const atelierId = typeof body?.atelierId === 'string' ? body.atelierId : null
  if (!atelierId) return reply({ error: 'Atelier manquant.' }, 400)

  // Utilisateur connecté (session Supabase du navigateur)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return reply({ error: 'Connectez-vous pour réserver.' }, 401)

  // Toutes les écritures : clé service_role (serveur uniquement)
  const admin = createAdminClient()

  // Prix, titre et disponibilité viennent de la base, jamais du navigateur
  const { data: atelier } = await admin
    .from('ateliers')
    .select('id, title, date, start_time, end_time, price, status, is_cancelled')
    .eq('id', atelierId)
    .maybeSingle()

  const today = new Date().toISOString().split('T')[0]
  if (!atelier || atelier.status !== 'approved' || atelier.is_cancelled || atelier.date < today) {
    return reply({ error: 'Cet atelier n’est pas ouvert à la réservation.' }, 400)
  }

  const amountCents = toCents(atelier.price)
  if (!(amountCents > 0)) {
    return reply({ error: 'Cet atelier est gratuit : inscrivez-vous directement depuis le planning.' }, 400)
  }

  const stripe = getStripe()

  const { data: existing } = await admin
    .from('reservations')
    .select('id, status, payment_id, stripe_payment_intent_id, stripe_checkout_session_id, payment_expires_at')
    .eq('atelier_id', atelier.id)
    .eq('user_id', user.id)
    .maybeSingle()

  // ── Cas de la ligne existante (UNIQUE user_id + atelier_id) ──
  if (existing) {
    if (existing.status === 'confirmed') {
      return reply({ error: 'Vous êtes déjà inscrit à cet atelier.' }, 409)
    }

    // Annulée après un paiement déjà reçu : réinscription sans nouveau paiement
    if (existing.status === 'cancelled' && (existing.payment_id || existing.stripe_payment_intent_id)) {
      const { error } = await admin
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', existing.id)
      if (error) return reply({ error: dbMessage(error.message) }, 409)
      return reply({ confirmed: true })
    }

    // Une session précédente existe : la réutiliser si elle est encore ouverte,
    // confirmer si elle a été payée, l'expirer sinon (une seule session active)
    if (existing.status === 'pending_payment' && existing.stripe_checkout_session_id) {
      try {
        const previous = await stripe.checkout.sessions.retrieve(existing.stripe_checkout_session_id)
        const stillHeld = existing.payment_expires_at && new Date(existing.payment_expires_at) > new Date()

        if (previous.status === 'complete' && previous.payment_status === 'paid') {
          await confirmPaidSession(previous, user.id)
          return reply({ url: `${siteUrl(req.nextUrl.origin)}/paiement/succes?session_id=${previous.id}` })
        }
        if (previous.status === 'open' && stillHeld && previous.url) {
          return reply({ url: previous.url })
        }
        if (previous.status === 'open') {
          await stripe.checkout.sessions.expire(previous.id)
        }
      } catch (err) {
        console.error('[Stripe] session précédente illisible', { reservationId: existing.id, err: String(err) })
      }
    }
  }

  // ── Bloquer la place : pending_payment pendant PAYMENT_HOLD_MINUTES ──
  // check_reservation_capacity refuse si l'atelier est complet.
  const holdUntil = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000)
  const holdFields = {
    status: 'pending_payment',
    payment_expires_at: holdUntil.toISOString(),
    stripe_checkout_session_id: null,
  }

  let reservationId: string
  let rollback: () => Promise<unknown>

  if (existing) {
    // cancelled, waitlist ou pending_payment (expiré, ou sans session)
    const previousStatus = existing.status === 'waitlist' ? 'waitlist' : 'cancelled'
    const { error } = await admin.from('reservations').update(holdFields).eq('id', existing.id)
    if (error) return reply({ error: dbMessage(error.message) }, 409)
    reservationId = existing.id
    rollback = async () => admin.from('reservations')
      .update({ status: previousStatus }).eq('id', existing.id).eq('status', 'pending_payment')
  } else {
    const { data: inserted, error } = await admin
      .from('reservations')
      .insert({ atelier_id: atelier.id, user_id: user.id, ...holdFields })
      .select('id')
      .single()
    if (error || !inserted) return reply({ error: dbMessage(error?.message ?? '') }, 409)
    reservationId = inserted.id
    rollback = async () => admin.from('reservations')
      .delete().eq('id', inserted.id).eq('status', 'pending_payment')
  }

  // ── Session Stripe Checkout ──
  const base = siteUrl(req.nextUrl.origin)
  const metadata = {
    reservation_id: reservationId,
    atelier_id: atelier.id,
    user_id: user.id,
    amount_cents: String(amountCents),
  }

  let createdSessionId: string | null = null
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        // Filtre « carte uniquement » (Apple Pay / Google Pay inclus) : paiement immédiat,
        // pas de moyen de paiement différé qui dépasserait le blocage de la place
        allowed_payment_method_types: ['card'],
        locale: 'fr',
        customer_email: user.email ?? undefined,
        client_reference_id: reservationId,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: amountCents,
            product_data: {
              name: `Atelier : ${atelier.title}`,
              description: `${atelier.date} · ${String(atelier.start_time).slice(0, 5)}–${String(atelier.end_time).slice(0, 5)}`,
            },
          },
        }],
        metadata,
        payment_intent_data: { metadata, description: `Réservation atelier : ${atelier.title}` },
        expires_at: Math.floor(holdUntil.getTime() / 1000),
        success_url: `${base}/paiement/succes?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/paiement/annule?reservation=${reservationId}`,
      },
      { idempotencyKey: `checkout-${reservationId}-${holdUntil.getTime()}` },
    )
    createdSessionId = session.id

    const { error } = await admin
      .from('reservations')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', reservationId)
    if (error) throw new Error(error.message)

    if (!session.url) throw new Error('Session Stripe sans URL')
    return reply({ url: session.url })
  } catch (err) {
    console.error('[Stripe] création de session impossible', { reservationId, err: String(err) })
    // Session créée mais non enregistrée : la fermer pour qu'elle ne soit pas payée
    if (createdSessionId) {
      await stripe.checkout.sessions.expire(createdSessionId).catch(() => {})
    }
    await rollback()
    return reply({ error: 'Le paiement n’a pas pu être lancé. Réessayez dans un instant.' }, 502)
  }
}
