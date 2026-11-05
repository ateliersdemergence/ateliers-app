'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarPlus, Lock, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TimeSelect from '@/components/ui/TimeSelect'
import type { Indisponibilite } from '@/types'

interface DayItem {
  id: string
  title: string
  start_time: string
  end_time: string
}

interface Props {
  // Jour au format yyyy-MM-dd
  date: string
  // Indisponibilité à modifier ; absente = création depuis un clic sur le jour
  indispo?: Indisponibilite | null
  // Ce qui est déjà prévu ce jour-là (rappel)
  dayItems: DayItem[]
  onClose: () => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition'

// Fenêtre du super admin : depuis un jour du planning, créer un atelier
// ou bloquer la salle ; depuis un bloc « Indisponible », le modifier ou le supprimer
export default function DayActionModal({ date, indispo, dayItems, onClose }: Props) {
  const router = useRouter()
  const [supabase] = useState(createClient)
  const editing = !!indispo

  const [startTime, setStartTime] = useState(indispo && !indispo.all_day ? indispo.start_time.slice(0, 5) : '')
  const [endTime, setEndTime] = useState(indispo && !indispo.all_day ? indispo.end_time.slice(0, 5) : '')
  const [allDay, setAllDay] = useState(indispo?.all_day ?? false)
  const [motif, setMotif] = useState(indispo?.motif ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const timesInvalid = !allDay && !!startTime && !!endTime && endTime <= startTime
  const canSave = motif.trim().length > 0 && (allDay || (!!startTime && !!endTime && !timesInvalid))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setError('')
    setSaving(true)

    const values = {
      date,
      all_day: allDay,
      start_time: allDay ? '00:00' : startTime,
      end_time: allDay ? '23:59' : endTime,
      motif: motif.trim(),
    }

    const { error: err } = editing
      ? await supabase.from('indisponibilites').update(values).eq('id', indispo!.id)
      : await supabase.from('indisponibilites').insert(values)

    setSaving(false)
    if (err) { setError(err.message); return }
    onClose()
    router.refresh()
  }

  async function handleDelete() {
    if (!indispo) return
    setError('')
    setSaving(true)
    const { error: err } = await supabase.from('indisponibilites').delete().eq('id', indispo.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onClose()
    router.refresh()
  }

  const others = dayItems.filter(item => item.id !== indispo?.id)

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-action-title"
        className="animate-scale-in bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h2 id="day-action-title" className="text-lg font-bold text-[var(--foreground)] capitalize">
              {format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {editing ? 'Modifier l’indisponibilité' : 'Que voulez-vous ajouter ?'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 rounded-xl hover:bg-[var(--border)] text-[var(--muted)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 pb-5 pt-4 flex flex-col gap-4">
          {!editing && (
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <Link
                href={`/ateliers/nouveau?date=${date}`}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                Nouvel atelier
              </Link>
              <span className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-white shadow-sm text-[var(--foreground)]">
                <Lock className="w-4 h-4" />
                Indisponibilité
              </span>
            </div>
          )}

          <label className="flex items-center gap-2.5 text-sm text-[var(--foreground)] cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={e => setAllDay(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            Toute la journée
          </label>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">Début</span>
                <TimeSelect value={startTime} onChange={setStartTime} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">Fin</span>
                <TimeSelect value={endTime} onChange={setEndTime} required />
              </div>
            </div>
          )}
          {timesInvalid && <p className="text-xs text-red-600 -mt-2">L’heure de fin doit être après l’heure de début.</p>}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="indispo-motif" className="text-sm font-medium text-[var(--foreground)]">
              Motif <span className="font-normal text-[var(--muted)]">(visible des admins uniquement)</span>
            </label>
            <input
              id="indispo-motif"
              type="text"
              value={motif}
              onChange={e => setMotif(e.target.value)}
              placeholder="Réunion, RDV, location de la salle…"
              maxLength={120}
              required
              className={inputClass}
            />
          </div>

          <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] px-3 py-2.5">
            <p className="text-xs font-semibold text-[var(--muted)] mb-1">Déjà prévu ce jour-là</p>
            {others.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">Rien : la journée est libre.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {others.map(item => (
                  <li key={item.id} className="text-xs text-[var(--foreground)] flex gap-2">
                    <span className="font-semibold tabular-nums">{item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}</span>
                    <span className="truncate">{item.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>}

          <div className="flex items-center gap-2">
            {editing && (
              confirmDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
                >
                  Confirmer la suppression
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              )
            )}
            <button
              type="submit"
              disabled={!canSave || saving}
              className="ml-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
