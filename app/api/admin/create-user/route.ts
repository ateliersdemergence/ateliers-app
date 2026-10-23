import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['animateur', 'collaborateur', 'participant'] as const

// Adresse publique du site, pour le lien de l'email d'invitation
function getSiteUrl(request: NextRequest) {
  const fromEnv = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

export async function POST(request: NextRequest) {
  // Vérifier que l'appelant est admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Lire le body
  const body = await request.json()
  const email = String(body.email ?? '').trim().toLowerCase()
  const full_name = String(body.full_name ?? '').trim()
  const phone = String(body.phone ?? '').trim() || null
  const role = body.role ?? 'animateur'

  if (!email || !full_name) {
    return NextResponse.json({ error: 'Email et nom requis' }, { status: 400 })
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Crée le compte et envoie l'email d'invitation (le rôle n'est PAS mis dans user_metadata)
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name, phone },
    redirectTo: `${getSiteUrl(request)}/definir-mot-de-passe`,
  })

  if (error || !data.user) {
    const message = error?.message ?? 'Erreur inconnue'
    if (/already (been )?registered|already exists/i.test(message)) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email. Changez plutôt son rôle dans la liste des inscrits.' }, { status: 400 })
    }
    if (/sending|smtp|email/i.test(message)) {
      return NextResponse.json({ error: `L'email d'invitation n'a pas pu être envoyé (${message}). Vérifiez la configuration SMTP Brevo dans Supabase.` }, { status: 502 })
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Rôle fixé côté serveur uniquement : app_metadata (non modifiable par l'utilisateur)…
  const { error: metaError } = await adminClient.auth.admin.updateUserById(data.user.id, {
    app_metadata: { ...data.user.app_metadata, role },
  })

  // … et table public.users, qui reste la référence pour l'appli et les règles RLS
  const { error: profileError } = await adminClient
    .from('users')
    .update({ role, full_name, phone })
    .eq('id', data.user.id)

  if (metaError || profileError) {
    return NextResponse.json(
      { error: `Invitation envoyée, mais le rôle n'a pas pu être enregistré : ${(metaError ?? profileError)!.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } }, { status: 201 })
}
