import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    // Synchronise le profil public avec les métadonnées auth (organisme, role, phone)
    if (session?.user) {
      const meta = session.user.user_metadata ?? {}
      const updates: Record<string, string | null> = {}

      if (meta.organisme !== undefined) updates.organisme = meta.organisme ?? null

      // Le rôle des métadonnées n'est appliqué qu'à un simple inscrit : sinon un
      // admin/animateur promu après coup perdrait son rôle en réinitialisant son mot de passe
      if (meta.role && meta.role !== 'admin') {
        const { data: current } = await supabase.from('users').select('role').eq('id', session.user.id).single()
        if (current?.role === 'participant') updates.role = meta.role
      }
      if (meta.phone !== undefined) updates.phone = meta.phone ?? null
      if (meta.full_name) updates.full_name = meta.full_name

      if (Object.keys(updates).length > 0) {
        await supabase.from('users').update(updates).eq('id', session.user.id)
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
