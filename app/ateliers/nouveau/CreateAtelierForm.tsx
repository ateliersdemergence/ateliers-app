'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, ArrowLeft, CalendarPlus, CheckCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TimeSelect from '@/components/ui/TimeSelect'
import MiniPlanning, { overlaps, type Creneau } from '@/components/ateliers/MiniPlanning'
import type { User, Theme } from '@/types'

interface Animateur {
  id: string
  full_name: string
  email: string
}

interface Props {
  profile: User
  animateurs: Animateur[]
}

export default function CreateAtelierForm({ profile, animateurs }: Props) {
  const isAdmin = profile.role === 'admin'
  // Seuls les ateliers du super admin sont publiés directement ; les autres attendent sa validation
  const isSuperAdmin = profile.is_super_admin ?? false
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    max_participants: 15,
    theme: 'travail' as Theme,
    location: '',
    animateur_id: isAdmin ? (animateurs[0]?.id ?? profile.id) : profile.id,
    price: 35,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const [supabase] = useState(createClient)

  // Mini planning : créneaux déjà pris sur le mois affiché (validés + en attente)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [loadingCreneaux, setLoadingCreneaux] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingCreneaux(true)
    supabase
      .rpc('creneaux_occupes', {
        p_from: format(startOfWeek(month, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        p_to: format(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      })
      .then(({ data }) => {
        if (cancelled) return
        setCreneaux((data ?? []) as Creneau[])
        setLoadingCreneaux(false)
      })
    return () => { cancelled = true }
  }, [month, supabase])

  const dayCreneaux = form.date ? creneaux.filter(c => c.date === form.date) : []
  const timesInvalid = !!form.start_time && !!form.end_time && form.end_time <= form.start_time
  const conflict = form.start_time && form.end_time && !timesInvalid
    ? dayCreneaux.find(c => overlaps(form.start_time, form.end_time, c.start_time, c.end_time))
    : undefined

  function set(key: string, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.date) { setError('Choisissez un jour dans le planning.'); return }
    if (timesInvalid) { setError("L'heure de fin doit être après l'heure de début."); return }
    if (conflict) { setError('Ce créneau est déjà pris, choisissez un autre horaire.'); return }

    setLoading(true)
    // Le statut (en attente / validé) est fixé par la base selon le rôle
    const { error } = await supabase.from('ateliers').insert({ ...form, is_cancelled: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (isSuperAdmin) {
      router.push('/planning')
      return
    }
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--border)] p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
          <Clock className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Atelier envoyé pour validation</h1>
          <p className="text-sm text-[var(--muted)] mt-2">
            « {form.title} » le {format(parseISO(form.date), 'EEEE d MMMM', { locale: fr })} de {form.start_time} à {form.end_time}.
            <br />Il apparaîtra au planning dès que le super administrateur l&apos;aura validé.
          </p>
        </div>
        <Link href="/dashboard" className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90">
          Voir mes ateliers
        </Link>
      </div>
    )
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition'

  return (
    <div>
      {/* Header */}
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
            <CalendarPlus className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Nouvel atelier</h1>
            <p className="text-sm text-[var(--muted)]">
              {isSuperAdmin
                ? 'Remplissez les informations pour créer un atelier'
                : 'Votre proposition sera publiée au planning après validation par le super administrateur'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)]">

        {/* Informations générales */}
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Informations</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Titre <span className="text-red-400">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="Ex : Gestion du temps & priorités"
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
              placeholder="Décrivez le contenu de l'atelier..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Thème <span className="text-red-400">*</span>
              </label>
              <select
                className={inputClass}
                value={form.theme}
                onChange={e => set('theme', e.target.value)}
              >
                <option value="travail">Professionnel</option>
                <option value="detente">Ludique</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Places max <span className="text-red-400">*</span>
              </label>
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
              Prix <span className="text-xs text-[var(--muted)] font-normal">(0 = gratuit)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                className={inputClass + ' pr-8'}
                min={0}
                step={0.01}
                value={form.price}
                onChange={e => set('price', parseFloat(e.target.value) || 0)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">€</span>
            </div>
          </div>
        </div>

        {/* Date & Horaires */}
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Date & Horaires</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Jour <span className="text-red-400">*</span>
            </label>
            <MiniPlanning
              month={month}
              onMonthChange={setMonth}
              selectedDate={form.date}
              onSelectDate={d => set('date', d)}
              creneaux={creneaux}
              loading={loadingCreneaux}
            />
          </div>

          {form.date && (
            <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-3">
              <p className="text-sm font-medium text-[var(--foreground)] capitalize mb-2">
                {format(parseISO(form.date), 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
              {dayCreneaux.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">Aucun atelier prévu ce jour-là : toute la journée est libre.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {dayCreneaux.map(c => (
                    <li key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-[var(--foreground)] tabular-nums">
                        {c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}
                      </span>
                      <span className="truncate text-[var(--foreground)]">{c.title}</span>
                      {c.animateur_name && <span className="truncate text-[var(--muted)]">· {c.is_mine ? 'vous' : c.animateur_name}</span>}
                      <span className={`ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        c.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-[var(--primary-light)] text-[var(--primary)]'
                      }`}>
                        {c.status === 'pending' ? 'En attente' : 'Validé'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Début <span className="text-red-400">*</span>
              </label>
              <TimeSelect value={form.start_time} onChange={v => set('start_time', v)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Fin <span className="text-red-400">*</span>
              </label>
              <TimeSelect value={form.end_time} onChange={v => set('end_time', v)} required />
            </div>
          </div>

          {timesInvalid && (
            <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              L&apos;heure de fin doit être après l&apos;heure de début.
            </p>
          )}
          {conflict && (
            <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Créneau déjà pris par « {conflict.title} » ({conflict.start_time.slice(0, 5)}–{conflict.end_time.slice(0, 5)}).
            </p>
          )}
          {form.date && form.start_time && form.end_time && !timesInvalid && !conflict && (
            <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Créneau disponible.
            </p>
          )}
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
              <label className="text-sm font-medium text-[var(--foreground)]">
                Animateur <span className="text-red-400">*</span>
              </label>
              <select
                className={inputClass}
                value={form.animateur_id}
                onChange={e => set('animateur_id', e.target.value)}
              >
                {animateurs.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.full_name} — {a.email}
                  </option>
                ))}
              </select>
            </div>
          ) : isAdmin && animateurs.length === 0 ? (
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              Aucun animateur actif. Créez d'abord un animateur depuis l'administration.
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--primary-light)] border border-[var(--border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {profile.full_name.charAt(0).toUpperCase()}
                </span>
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
              disabled={loading || (isAdmin && animateurs.length === 0) || !!conflict || timesInvalid}
              className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4" />
                  {isSuperAdmin ? "Créer l'atelier" : 'Envoyer pour validation'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
