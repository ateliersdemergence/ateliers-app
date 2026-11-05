import 'server-only'
import Stripe from 'stripe'

// Durée pendant laquelle la place est bloquée pendant le paiement.
// Stripe impose au moins 30 minutes entre la création d'une session Checkout
// et son expiration : 31 minutes laissent une marge pour l'écart d'horloge.
// La session Stripe et le blocage en base expirent au même instant.
export const PAYMENT_HOLD_MINUTES = 31

let stripeClient: Stripe | null = null

// Créé à la première utilisation (et non au chargement du module) pour que
// le build fonctionne sans les variables d'environnement Stripe.
export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY manquante')
    stripeClient = new Stripe(key)
  }
  return stripeClient
}

export function siteUrl(fallbackOrigin: string): string {
  return (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? fallbackOrigin).replace(/\/$/, '')
}

// Prix en euros (numeric) -> centimes
export function toCents(price: number | string): number {
  return Math.round(Number(price) * 100)
}
