import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['animateur', 'collaborateur', 'participant'] as const

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

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name, role, phone },
  })

  if (error) {
    const alreadyExists = /already (been )?registered|already exists/i.test(error.message)
    return NextResponse.json(
      { error: alreadyExists ? 'Un compte existe déjà avec cet email. Changez plutôt son rôle dans la liste des inscrits.' : error.message },
      { status: 400 }
    )
  }

  // Le trigger crée le profil ; on s'assure que rôle et téléphone sont bien renseignés
  await adminClient.from('users').update({ role, full_name, phone }).eq('id', data.user.id)

  return NextResponse.json({ user: data.user }, { status: 201 })
}
