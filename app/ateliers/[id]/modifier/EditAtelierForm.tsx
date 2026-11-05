'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TimeSelect from '@/components/ui/TimeSelect'
import type { User, Theme } from '@/types'
import { parsePrice } from '@/lib/price'

interface Atelier {
  id: string
  title: string
  description: string | null
  date: string
  start_time: string
  end_time: string
  max_participants: number
  theme: Theme
  location: string | null
  animateur_id: string
  price?: number
}

interface Props {
  atelier: Atelier
  profile: User
  animateurs: { id: string; full_name: string; email: string }[]
}

export default function EditAtelierForm({ atelier, profile, animateurs }: Props) {
  const isAdmin = profile.role === 'admin'
  const [form, setForm] = useState({
    title: atelier.title,
    description: atelier.description ?? '',
    date: atelier.date,
    start_time: atelier.start_time.slice(0, 5),
    end_time: atelier.end_time.slice(0, 5),
    max_participants: atelier.max_participants,
    theme: atelier.theme,
    location: atelier.location ?? '',
    animateur_id: atelier.animateur_id,
    // Prix obligatoire (0 = gratuit), saisi en texte pour ne jamais le remplacer en silence
    price: atelier.price != null ? String(atelier.price) : '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function set(key: string, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const price = parsePrice(form.price)
    if (price === null) { setError('Indiquez un prix (0 pour un atelier gratuit).'); return }
    setLoading(true)

    const { error } = await supabase
      .from('ateliers')
      .update({ ...form, price })
      .eq('id', atelier.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/planning')
    router.refresh()
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition'

  return (
    <div>
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center">
            <Save className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Modifier l'atelier</h1>
            <p className="text-sm text-[var(--muted)]">{atelier.title}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)]">

        {/* Informations générales */}
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Informations</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Titre <span className="text-red-400">*</span></label>
            <input
              className={inputClass}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Description</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Thème <span className="text-red-400">*</span></label>
              <select className={inputClass} value={form.theme} onChange={e => set('theme', e.target.value)}>
                <option value="travail">Professionnel</option>
                <option value="detente">Ludique</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Places max <span className="text-red-400">*</span></label>
              <input
                type="number"
                className={inputClass}
                min={1}
                max={50}
                value={form.max_participants}
                onChange={e => set('max_participants', parseInt(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Prix <span className="text-red-400">*</span> <span className="text-xs text-[var(--muted)] font-normal">(0 = gratuit)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                className={inputClass + ' pr-8'}
                min={0}
                step={0.01}
                value={form.price}
                onChange={e => set('price', e.target.value)}
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">€</span>
            </div>
          </div>
        </div>

        {/* Date & Horaires */}
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Date & Horaires</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Date <span className="text-red-400">*</span></label>
            <input
              type="date"
              className={inputClass}
              value={form.date}
              onChange={e => set('date', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Début <span className="text-red-400">*</span></label>
              <TimeSelect value={form.start_time} onChange={v => set('start_time', v)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Fin <span className="text-red-400">*</span></label>
              <TimeSelect value={form.end_time} onChange={v => set('end_time', v)} required />
            </div>
          </div>
        </div>

        {/* Lieu & Animateur */}
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Lieu & Animateur</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Lieu</label>
            <input
              className={inputClass}
              placeholder="Salle A, Zoom, Espace bien-être..."
              value={form.location}
              onChange={e => set('location', e.target.value)}
            />
          </div>

          {isAdmin && animateurs.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Animateur <span className="text-red-400">*</span></label>
              <select className={inputClass} value={form.animateur_id} onChange={e => set('animateur_id', e.target.value)}>
                {animateurs.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name} — {a.email}</option>
                ))}
              </select>
            </div>
          ) : isAdmin && animateurs.length === 0 ? (
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              Aucun animateur actif disponible.
            </div>
          ) : !isAdmin && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--primary-light)] border border-[var(--border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{profile.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--primary)]">{profile.full_name}</p>
                <p className="text-xs text-[var(--muted)]">Vous êtes l'animateur de cet atelier</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 flex flex-col gap-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Save className="w-4 h-4" /> Enregistrer</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
