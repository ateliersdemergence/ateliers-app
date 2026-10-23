export const PAYPAL_BASE = 'https://api-m.paypal.com'

export async function getPaypalAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()
  return data.access_token as string
}

// Prix appliqué quand l'atelier n'a pas de prix renseigné (même règle que AtelierCard)
export const DEFAULT_ATELIER_PRICE = 25

export function atelierPrice(price: number | null | undefined): number {
  return price ?? DEFAULT_ATELIER_PRICE
}
