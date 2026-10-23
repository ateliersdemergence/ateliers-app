import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PAYPAL_BASE, getPaypalAccessToken, atelierPrice } from '@/lib/paypal'

export default async function PaypalSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const orderId = params.token

  if (!orderId) redirect('/planning')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const token = await getPaypalAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })

  const capture = await res.json()
  if (capture.status !== 'COMPLETED') redirect('/planning')

  const unit = capture.purchase_units?.[0]
  const payment = unit?.payments?.captures?.[0]
  const atelierId: string | undefined = unit?.custom_id ?? payment?.custom_id
  if (!atelierId) redirect('/planning')

  // Vérifie que le montant payé correspond bien au prix de l'atelier
  const { data: atelier } = await supabase.from('ateliers').select('price').eq('id', atelierId).single()
  const paid = Number(payment?.amount?.value ?? 0)
  if (!atelier || payment?.amount?.currency_code !== 'EUR' || paid + 0.001 < atelierPrice(atelier.price)) {
    console.error('[PayPal] montant incorrect', { orderId, atelierId, paid, expected: atelier?.price })
    redirect(`/planning?pp_err=${encodeURIComponent('Montant du paiement incorrect, contactez-nous.')}`)
  }

  // Seul le serveur peut confirmer une réservation payante (protégé en base par un trigger)
  const admin = createAdminClient()
  const paymentFields = { status: 'confirmed', payment_id: orderId, payment_method: 'paypal' }

  const { data: existing } = await admin
    .from('reservations')
    .select('id')
    .eq('atelier_id', atelierId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await admin.from('reservations').update(paymentFields).eq('id', existing.id)
  } else {
    await admin.from('reservations').insert({ atelier_id: atelierId, user_id: user.id, ...paymentFields })
  }

  redirect('/planning')
}
