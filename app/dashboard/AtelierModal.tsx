'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import TimeSelect from '@/components/ui/TimeSelect'
import type { Atelier, Theme } from '@/types'

interface Props {
  atelier: Atelier | null
  animateurId: string
  onClose: () => void
}

export default function AtelierModal({ atelier, animateurId, onClose }: Props) {
  const [form, setForm] = useState({
    title: atelier?.title ?? '',
    description: atelier?.description ?? '',
    date: atelier?.date ?? '',
    start_time: atelier?.start_time ?? '',
    end_time: atelier?.end_time ?? '',
    max_participants: atelier?.max_participants ?? 20,
    theme: (atelier?.theme ?? 'travail') as Theme,
    location: atelier?.location ?? '',
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
    setLoading(true)
    setError('')

    // En modification, on garde l'animateur d'origine (un admin peut éditer l'atelier d'un autre)
    const payload = atelier ? form : { ...form, animateur_id: animateurId }

    const { error } = atelier
      ? await supabase.from('ateliers').update(payload).eq('id', atelier.id)
      : await supabase.from('ateliers').insert(payload)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  const inputClass = 'w-full px-3 py-2 rounded-xl border border-[var(--border)] text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">
            {atelier ? 'Modifier l\'atelier' : 'Nouvel atelier'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors">
            <X className="w-4 h-4 text-[var(--muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Titre</label>
            <input className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Thème</label>
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
              <label className="text-sm font-medium">Places max</label>
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
            <label className="text-sm font-medium">Date</label>
            <input type="date" className={inputClass} value={form.date} onChange={e => set('date', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Début</label>
              <TimeSelect value={form.start_time} onChange={v => set('start_time', v)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Fin</label>
              <TimeSelect value={form.end_time} onChange={v => set('end_time', v)} required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Lieu (optionnel)</label>
            <input className={inputClass} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Salle A, Zoom, ..." />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 mt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" loading={loading} className="flex-1">
              {atelier ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
