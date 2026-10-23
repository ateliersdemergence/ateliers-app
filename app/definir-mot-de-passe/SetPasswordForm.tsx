'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import Button from '@/components/ui/Button'
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

// Client dédié : on lit nous-mêmes le lien d'invitation (le client par défaut, en mode PKCE,
// refuse les liens au format #access_token envoyés par les invitations admin)
function createInviteClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { isSingleton: false, auth: { detectSessionInUrl: false } }
  )
}

type Status = 'checking' | 'ready' | 'invalid' | 'done'
type InviteClient = ReturnType<typeof createInviteClient>

const INVALID_LINK = 'Ce lien est invalide ou a expiré.'

async function sessionFromUrl(supabase: InviteClient): Promise<string | null> {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)

  // Lien expiré ou déjà utilisé : Supabase renvoie l'erreur dans l'URL
  const urlError = hash.get('error_description') ?? query.get('error_description')
  if (urlError) {
    const code = hash.get('error_code') ?? query.get('error_code')
    return code === 'otp_expired' ? 'Ce lien a expiré ou a déjà été utilisé.' : urlError.replace(/\+/g, ' ')
  }

  // 1. Format implicite : #access_token=…&refresh_token=…
  const access_token = hash.get('access_token')
  const refresh_token = hash.get('refresh_token')
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    return error ? INVALID_LINK : null
  }

  // 2. Format PKCE : ?code=…
  const code = query.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return error ? INVALID_LINK : null
  }

  // 3. Format token_hash (modèle d'email personnalisé) : ?token_hash=…&type=invite
  const token_hash = query.get('token_hash')
  const type = query.get('type') as EmailOtpType | null
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    return error ? INVALID_LINK : null
  }

  // 4. Pas de jeton dans l'URL : une session est peut-être déjà ouverte
  const { data: { session } } = await supabase.auth.getSession()
  return session ? null : "Lien d'invitation manquant ou incomplet."
}

export default function SetPasswordForm() {
  const [supabase, setSupabase] = useState<InviteClient | null>(null)
  const [status, setStatus] = useState<Status>('checking')
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Le client n'est créé que dans le navigateur (il lit l'URL et les cookies)
  useEffect(() => {
    const client = createInviteClient()
    setSupabase(client)
    sessionFromUrl(client).then(err => {
      // Retire les jetons de la barre d'adresse
      window.history.replaceState(null, '', window.location.pathname)
      if (err) { setLinkError(err); setStatus('invalid') }
      else setStatus('ready')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!supabase) return

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError("Impossible d'enregistrer le mot de passe. Le lien a peut-être expiré.")
      return
    }

    setStatus('done')
    setTimeout(() => { window.location.href = '/dashboard' }, 2000)
  }

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
        <p className="text-sm text-[var(--muted)]">Vérification du lien…</p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <p className="font-semibold text-[var(--foreground)]">{linkError}</p>
        <p className="text-sm text-[var(--muted)]">
          Demandez une nouvelle invitation à un administrateur, ou utilisez{' '}
          <Link href="/mot-de-passe-oublie" className="text-[var(--primary)] hover:underline">Mot de passe oublié</Link>
          {' '}avec votre adresse email.
        </p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-500" />
        </div>
        <p className="font-semibold text-[var(--foreground)]">Mot de passe enregistré !</p>
        <p className="text-sm text-[var(--muted)]">Redirection vers votre espace…</p>
      </div>
    )
  }

  const inputClass = 'w-full px-3 py-2 rounded-xl border border-[var(--border)] text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--foreground)]">Mot de passe</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoFocus className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--foreground)]">Confirmer le mot de passe</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required className={inputClass} />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full mt-1">
        Activer mon compte
      </Button>
    </form>
  )
}
