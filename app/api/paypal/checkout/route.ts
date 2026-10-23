import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PAYPAL_BASE, getPaypalAccessToken, atelierPrice } from '@/lib/paypal'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const atelierId = searchParams.get('atelierId')
  const siteUrl = process.env.SITE_URL ?? 'https://lesateliersdemergence.up.railway.app'

  if (!atelierId) {
    return NextResponse.redirect(`${siteUrl}/planning`)
  }

  // Le prix et le titre viennent de la base, jamais du navigateur
  const supabase = await createClient()
  const { data: atelier } = await supabase
    .from('ateliers')
    .select('id, title, price')
    .eq('id', atelierId)
    .single()

  if (!atelier) {
    return NextResponse.redirect(`${siteUrl}/planning`)
  }

  try {
    const token = await getPaypalAccessToken()

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'EUR', value: atelierPrice(atelier.price).toFixed(2) },
          description: `Réservation atelier : ${atelier.title}`,
          custom_id: atelier.id,
        }],
        application_context: {
          return_url: `${siteUrl}/paypal/success`,
          cancel_url: `${siteUrl}/planning`,
          brand_name: "Les Ateliers d'Émergence",
          locale: 'fr-FR',
          user_action: 'PAY_NOW',
        },
      }),
    })

    const order = await res.json()
    const approveUrl = order.links?.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href

    if (!approveUrl) {
      const err = encodeURIComponent(JSON.stringify(order).slice(0, 200))
      return NextResponse.redirect(`${siteUrl}/planning?pp_err=${err}`)
    }

    return NextResponse.redirect(approveUrl)
  } catch (err) {
    const msg = encodeURIComponent(String(err).slice(0, 200))
    return NextResponse.redirect(`${siteUrl}/planning?pp_err=${msg}`)
  }
}
