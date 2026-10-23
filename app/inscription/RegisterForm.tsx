'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import { CheckCircle2 } from 'lucide-react'

export default function RegisterForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [organisme, setOrganisme] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  const matchedCompany = companies.find(
    c => c.name.trim().toLowerCase() === organisme.trim().toLowerCase()
  ) ?? null

  const isCollaborateur = matchedCompany !== null

  // Fetch companies once on mount
  useEffect(() => {
    supabase.from('entreprises').select('id, name').order('name').then(({ data }) => {
      setCompanies(data ?? [])
    })
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleOrganismeChange(value: string) {
    setOrganisme(value)
    if (value.trim().length >= 2) {
      const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(value.trim().toLowerCase())
      )
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  function selectCompany(name: string) {
    setOrganisme(name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const role = isCollaborateur ? 'collaborateur' : 'participant'
    const digits = phone.trim().replace(/^0/, '')
    const fullPhone = digits ? `+33${digits}` : null
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=/`,
        data: {
          full_name: fullName,
          role,
          phone: fullPhone,
          organisme: organisme.trim() || null,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.session && data.user) {
      // Le rôle (participant / collaborateur) est fixé par le trigger handle_new_user
      await supabase.from('users').update({
        phone: fullPhone,
        organisme: organisme.trim() || null,
      }).eq('id', data.user.id)
      window.location.href = '/planning'
      return
    }

    setError('Vérifiez votre boîte mail pour confirmer votre compte.')
    setLoading(false)
  }

  const inputClass = 'w-full px-3 py-2 rounded-xl border border-[var(--border)] text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-sm font-medium text-[var(--foreground)]">Prénom</label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Jean"
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-sm font-medium text-[var(--foreground)]">Nom</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Dupont"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--foreground)]">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--foreground)]">
          Téléphone <span className="text-[var(--muted)] font-normal">(optionnel)</span>
        </label>
        <div className="flex rounded-xl border border-[var(--border)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:border-transparent transition">
          <span className="flex items-center px-3 bg-[var(--border)] text-sm text-[var(--muted)] border-r border-[var(--border)] select-none whitespace-nowrap">
            +33
          </span>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="6 12 34 56 78"
            className="flex-1 px-3 py-2 text-sm bg-[var(--background)] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--foreground)]">
          Employé au sein d'une entreprise partenaire ?
        </label>
        <p className="text-xs text-[var(--muted)] -mt-0.5">
          Si oui, indiquez-la ci-dessous :
        </p>

        <div className="relative" ref={suggestionsRef}>
          <input
            type="text"
            value={organisme}
            onChange={e => handleOrganismeChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
            placeholder="Nom de l'entreprise partenaire"
            className={`${inputClass} ${isCollaborateur ? 'border-green-400 ring-2 ring-green-200' : ''}`}
            autoComplete="off"
          />

          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="animate-scale-in absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[var(--border)] shadow-lg overflow-hidden z-20">
              {suggestions.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCompany(c.name)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)] transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-lg bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[var(--primary)]">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation badge */}
        {isCollaborateur && (
          <div className="animate-fade-slide flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            Entreprise partenaire reconnue — accès collaborateur attribué
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--foreground)]">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          minLength={8}
          required
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full mt-1">
        Créer mon compte
      </Button>
    </form>
  )
}
