import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Adresse publique du site. Derrière le proxy Railway, `new URL(request.url).origin`
// vaut l'adresse interne du serveur (http://localhost:...), ce qui envoyait les
// utilisateurs vers localhost après la confirmation de leur email.
function getSiteUrl(request: NextRequest) {
  const fromEnv = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  // N'accepte que des chemins internes au site
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    // Synchronise le profil public avec les métadonnées auth (organisme, phone, nom).
    // Le rôle n'est JAMAIS lu ici : user_metadata est modifiable par l'utilisateur.
    // Il est fixé par le trigger handle_new_user puis uniquement par un admin.
    if (session?.user) {
      const meta = session.user.user_metadata ?? {}
      const updates: Record<string, string | null> = {}

      if (meta.organisme !== undefined) updates.organisme = meta.organisme ?? null
      if (meta.phone !== undefined) updates.phone = meta.phone ?? null
      if (meta.full_name) updates.full_name = meta.full_name

      if (Object.keys(updates).length > 0) {
        await supabase.from('users').update(updates).eq('id', session.user.id)
      }
    }
  }

  return NextResponse.redirect(`${getSiteUrl(request)}${next}`)
}
