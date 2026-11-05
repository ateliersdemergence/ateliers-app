import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { confirmPaidSession, releasePendingSession } from '@/lib/stripe-reservations'

// Notifications envoyées par Stripe (Dashboard > Développeurs > Webhooks,
// ou en local : stripe listen --forward-to localhost:3000/api/stripe/webhook)
// Événements à activer : checkout.session.completed, checkout.session.expired
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers.get('stripe-signature')
  if (!secret || !signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  // Corps BRUT : la signature est calculée sur le texte exact envoyé par Stripe
  const payload = await req.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret)
  } catch (err) {
    console.error('[Stripe webhook] signature invalide', String(err))
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.payment_status === 'paid') {
          const result = await confirmPaidSession(session)
          // Erreur de base : 500 pour que Stripe renvoie l'événement plus tard.
          // Incohérence (montant, utilisateur…) : inutile de réessayer, déjà journalisée.
          if (!result.ok && result.reason === 'db_error') {
            return NextResponse.json({ error: 'Confirmation impossible' }, { status: 500 })
          }
        }
        break
      }
      case 'checkout.session.expired': {
        await releasePendingSession(event.data.object)
        break
      }
      default:
        // Autres événements ignorés
        break
    }
  } catch (err) {
    console.error('[Stripe webhook] traitement impossible', { type: event.type, id: event.id, err: String(err) })
    return NextResponse.json({ error: 'Traitement impossible' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
