'use client'

import { useState } from 'react'
import { X, Calendar, Clock, MapPin, ShieldCheck, CreditCard, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Atelier } from '@/types'

interface AtelierForPayment extends Atelier {
  price: number
  users?: {
    full_name: string
    email?: string | null
    organisme?: string | null
  } | null
}

interface Props {
  atelier: AtelierForPayment
  // Réinscription confirmée sans paiement (réservation déjà payée puis annulée)
  onSuccess: () => void
  onClose: () => void
}

export default function PaymentModal({ atelier, onSuccess, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isTravail = atelier.theme === 'travail'
  const themeColor = isTravail ? 'var(--travail)' : 'var(--detente)'

  const dateFormatted = (() => {
    try { return format(parseISO(atelier.date), "EEEE d MMMM yyyy", { locale: fr }) }
    catch { return atelier.date }
  })()

  // Le serveur bloque la place 30 minutes et crée la session Stripe ;
  // le prix est relu en base, rien n'est envoyé d'autre que l'identifiant
  async function handleCheckout() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atelierId: atelier.id }),
      })
      const data = await res.json().catch(() => ({})) as { url?: string; confirmed?: boolean; error?: string }

      if (data.url) {
        window.location.href = data.url
        return
      }
      if (data.confirmed) {
        onSuccess()
        return
      }
      setError(data.error ?? 'Le paiement n’a pas pu être lancé. Réessayez dans un instant.')
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.')
    }
    setLoading(false)
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="animate-slide-up bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--foreground)]">Confirmer la réservation</span>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-[var(--background)] text-[var(--muted)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Récapitulatif */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="h-1" style={{ background: themeColor }} />
            <div className="p-4">
              <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full text-white mb-2" style={{ background: themeColor }}>
                {isTravail ? 'Professionnel' : 'Ludique'}
              </span>
              <h3 className="font-bold text-[var(--foreground)] mb-3">{atelier.title}</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 text-sm text-[var(--muted)]">
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} />
                  <span className="capitalize">{dateFormatted}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-[var(--muted)]">
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} />
                  <span>{atelier.start_time.slice(0, 5)} – {atelier.end_time.slice(0, 5)}</span>
                </div>
                {atelier.location && (
                  <div className="flex items-center gap-2.5 text-sm text-[var(--muted)]">
                    <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} />
                    <span>{atelier.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {atelier.users?.full_name && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style={{ background: themeColor }}>
                {atelier.users.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{atelier.users.full_name}</p>
                <p className="text-xs text-[var(--muted)]">{atelier.users.organisme ?? atelier.users.email ?? 'Animateur'}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <span className="text-sm font-medium text-[var(--foreground)]">Total à régler</span>
            <span className="text-2xl font-bold" style={{ color: themeColor }}>{atelier.price.toFixed(2)} €</span>
          </div>

          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Vous serez redirigé vers la page de paiement sécurisée Stripe (carte bancaire, Apple Pay, Google Pay).
            Votre place est réservée pendant 30 minutes le temps du paiement.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--background)]">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: themeColor }}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <><CreditCard className="w-4 h-4" /> Payer {atelier.price.toFixed(2)} €</>}
          </button>
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              Annuler
            </button>
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Paiement sécurisé par Stripe
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
