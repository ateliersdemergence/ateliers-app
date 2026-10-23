'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, X, Clock, MapPin, Users, CalendarCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { PendingAtelier } from './page'

export default function ValidationContent({ ateliers }: { ateliers: PendingAtelier[] }) {
  const router = useRouter()
  const [supabase] = useState(createClient)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<PendingAtelier | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  async function decide(atelier: PendingAtelier, status: 'approved' | 'rejected', rejectionReason?: string) {
    setError('')
    setBusyId(atelier.id)
    const { error } = await supabase
      .from('ateliers')
      .update({ status, rejection_reason: status === 'rejected' ? (rejectionReason?.trim() || null) : null })
      .eq('id', atelier.id)
    setBusyId(null)
    if (error) { setError(error.message); return }
    setRejecting(null)
    setReason('')
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
          <CalendarCheck className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Ateliers à valider</h1>
          <p className="text-sm text-[var(--muted)]">
            {ateliers.length === 0
              ? 'Aucune proposition en attente'
              : `${ateliers.length} proposition${ateliers.length > 1 ? 's' : ''} en attente`}
          </p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      <div className="flex flex-col gap-3">
        {ateliers.map(a => (
          <Card key={a.id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge theme={a.theme} label={a.theme === 'travail' ? 'Professionnel' : 'Ludique'} />
                  <h2 className="font-semibold text-[var(--foreground)] truncate">{a.title}</h2>
                </div>
                <p className="text-sm text-[var(--foreground)] capitalize">
                  {format(parseISO(a.date), 'EEEE d MMMM yyyy', { locale: fr })} · {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Proposé par {a.users?.full_name ?? 'animateur inconnu'}
                  {a.users?.email && <> · {a.users.email}</>}
                </p>
              </div>
              <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                <Clock className="w-3 h-3" />En attente
              </span>
            </div>

            {a.description && <p className="text-sm text-[var(--muted)] whitespace-pre-line">{a.description}</p>}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
              {a.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.location}</span>}
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.max_participants} places</span>
              <span>{Number(a.price) > 0 ? `${Number(a.price).toFixed(2)} €` : 'Gratuit'}</span>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => { setRejecting(a); setReason('') }}
                disabled={busyId === a.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />Refuser
              </button>
              <button
                onClick={() => decide(a, 'approved')}
                disabled={busyId === a.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Check className="w-4 h-4" />Valider et publier
              </button>
            </div>
          </Card>
        ))}
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/30 p-4" onClick={() => setRejecting(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[var(--foreground)]">Refuser « {rejecting.title} »</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--muted)]">Motif (visible par l&apos;animateur, optionnel)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Ex : créneau réservé à un événement, merci de proposer une autre date"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejecting(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)]">
                Annuler
              </button>
              <button
                onClick={() => decide(rejecting, 'rejected', reason)}
                disabled={busyId === rejecting.id}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                Refuser l&apos;atelier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
