import Link from 'next/link'
import { redirect } from 'next/navigation'
import type Stripe from 'stripe'
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { confirmPaidSession } from '@/lib/stripe-reservations'

type State = 'confirmed' | 'processing' | 'problem'

export default async function PaiementSuccesPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams
  if (!sessionId || !sessionId.startsWith('cs_')) redirect('/planning')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  // On ne se fie jamais à l'URL : la session est relue auprès de Stripe
  let session: Stripe.Checkout.Session | null = null
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId)
  } catch (err) {
    console.error('[Stripe] page de succès : session illisible', { sessionId, err: String(err) })
  }

  // La session doit appartenir à l'utilisateur connecté
  if (session && session.metadata?.user_id !== user.id) redirect('/planning')

  let state: State = 'problem'
  let atelierTitle: string | null = null
  if (session?.payment_status === 'paid') {
    // Même logique que le webhook (idempotente) : confirme même si le webhook tarde
    const result = await confirmPaidSession(session, user.id)
    if (result.ok) {
      state = 'confirmed'
      const { data: atelier } = await supabase.from('ateliers').select('title').eq('id', result.atelierId).maybeSingle()
      atelierTitle = atelier?.title ?? null
    }
  } else if (session?.status === 'open' || session?.status === 'complete') {
    state = 'processing'
  }

  const content = {
    confirmed: {
      icon: <CheckCircle2 className="w-6 h-6 text-green-600" />, bg: 'bg-green-50',
      title: 'Réservation confirmée',
      text: atelierTitle
        ? `Votre paiement a bien été reçu. Votre place pour « ${atelierTitle} » est réservée.`
        : 'Votre paiement a bien été reçu. Votre place est réservée.',
    },
    processing: {
      icon: <Clock className="w-6 h-6 text-amber-500" />, bg: 'bg-amber-50',
      title: 'Paiement en cours de confirmation',
      text: 'Votre paiement est en cours de traitement. Votre réservation apparaîtra dans votre compte dans quelques instants.',
    },
    problem: {
      icon: <AlertTriangle className="w-6 h-6 text-red-500" />, bg: 'bg-red-50',
      title: 'Réservation à vérifier',
      text: 'Nous n’avons pas pu confirmer votre réservation automatiquement. Si vous avez été débité, contactez-nous : nous régulariserons ou vous rembourserons.',
    },
  }[state]

  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-2xl border border-[var(--border)] p-8 flex flex-col items-center gap-4 text-center">
          <div className={`w-12 h-12 rounded-full ${content.bg} flex items-center justify-center`}>{content.icon}</div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">{content.title}</h1>
          <p className="text-sm text-[var(--muted)]">{content.text}</p>
          <div className="flex gap-3 mt-2">
            <Link href="/planning" className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)]">
              Planning
            </Link>
            <Link href="/mon-compte" className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90">
              Mon compte
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
