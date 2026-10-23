'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Users, Pencil, Clock, XCircle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import AtelierModal from './AtelierModal'
import type { User, Atelier } from '@/types'

interface Props {
  profile: User
  ateliers: Atelier[]
}

export default function DashboardContent({ profile, ateliers }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editingAtelier, setEditingAtelier] = useState<Atelier | null>(null)

  const upcoming = ateliers.filter(a => new Date(a.date) >= new Date())
  const past = ateliers.filter(a => new Date(a.date) < new Date())

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Tableau de bord</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Bonjour, {profile.full_name}</p>
        </div>
        {/* Création via le formulaire avec mini planning (contrôle des créneaux + validation) */}
        <Link href="/ateliers/nouveau">
          <Button>
            <Plus className="w-4 h-4" />
            Nouvel atelier
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Ateliers à venir', value: upcoming.length },
          { label: 'Ateliers passés', value: past.length },
          { label: 'Inscrits total', value: ateliers.reduce((acc, a) => acc + (a.spots_taken ?? 0), 0) },
          { label: 'Taux de remplissage', value: `${Math.round((ateliers.reduce((acc, a) => acc + (a.spots_taken ?? 0), 0) / Math.max(ateliers.reduce((acc, a) => acc + a.max_participants, 0), 1)) * 100)}%` },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4">
            <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Ateliers list */}
      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-[var(--foreground)]">Ateliers à venir</h2>
        {upcoming.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[var(--muted)] text-sm">Aucun atelier planifié. Créez-en un !</p>
          </Card>
        ) : (
          upcoming.map(atelier => (
            <AtelierRow
              key={atelier.id}
              atelier={atelier}
              onEdit={() => { setEditingAtelier(atelier); setShowModal(true) }}
            />
          ))
        )}
      </div>

      {showModal && (
        <AtelierModal
          atelier={editingAtelier}
          animateurId={profile.id}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function AtelierRow({ atelier, onEdit }: { atelier: Atelier; onEdit: () => void }) {
  const spotsTaken = atelier.spots_taken ?? 0
  const fill = Math.round((spotsTaken / atelier.max_participants) * 100)

  return (
    <Card className="p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge theme={atelier.theme} label={atelier.theme === 'travail' ? 'Professionnel' : 'Ludique'} />
          <span className="text-sm font-semibold text-[var(--foreground)] truncate">{atelier.title}</span>
          {atelier.status === 'pending' && (
            <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
              <Clock className="w-3 h-3" />En attente de validation
            </span>
          )}
          {atelier.status === 'rejected' && (
            <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-500">
              <XCircle className="w-3 h-3" />Refusé
            </span>
          )}
        </div>
        {atelier.status === 'rejected' && (
          <p className="text-xs text-red-500 mb-1">
            {atelier.rejection_reason ? `Motif : ${atelier.rejection_reason}. ` : ''}Modifiez-le pour le soumettre à nouveau.
          </p>
        )}
        <p className="text-xs text-[var(--muted)] capitalize">
          {format(parseISO(atelier.date), 'EEEE d MMMM', { locale: fr })} · {atelier.start_time.slice(0, 5)}–{atelier.end_time.slice(0, 5)}
          {atelier.location && ` · ${atelier.location}`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <Users className="w-3.5 h-3.5" />
          <span>{spotsTaken}/{atelier.max_participants}</span>
        </div>
        <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--primary)] rounded-full transition-all"
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}
