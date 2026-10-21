'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Clock, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ParticipantsModal from './ParticipantsModal'
import AnimateurModal from './AnimateurModal'
import PaymentModal from './PaymentModal'
import type { Atelier } from '@/types'

interface AtelierWithAnimateur extends Atelier {
  users?: {
    full_name: string
    email?: string | null
    phone?: string | null
    organisme?: string | null
  }
}

interface Props {
  atelier: AtelierWithAnimateur
  isReserved: boolean
  isLoggedIn: boolean
  userRole?: string | null
  canViewParticipants?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export default function AtelierCard({ atelier, isReserved, isLoggedIn, userRole, canViewParticipants, canEdit, canDelete }: Props) {
  const [reserved, setReserved] = useState(isReserved)
  const [loading, setLoading] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showAnimateur, setShowAnimateur] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const isTravail = atelier.theme === 'travail'
  const spotsTaken = atelier.spots_taken ?? 0
  const spotsRemaining = atelier.max_participants - spotsTaken
  const isFull = spotsRemaining <= 0
  const fillPercent = Math.min(100, Math.round((spotsTaken / atelier.max_participants) * 100))

  const closeMenu = useCallback(() => {
    setContextMenu(null)
    setConfirmDelete(false)
  }, [])

  useEffect(() => {
    if (!contextMenu) return
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [contextMenu, closeMenu])

  function handleContextMenu(e: React.MouseEvent) {
    if (!canEdit && !canDelete) return
    e.preventDefault()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const menuW = 180
    const menuH = 100
    setContextMenu({
      x: e.clientX + menuW > vw ? e.clientX - menuW : e.clientX,
      y: e.clientY + menuH > vh ? e.clientY - menuH : e.clientY,
    })
    setConfirmDelete(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('ateliers').delete().eq('id', atelier.id)
    setDeleting(false)
    closeMenu()
    router.refresh()
  }

  const price = atelier.price ?? 25
  // Collaborateurs (entreprises partenaires) et admins s'inscrivent gratuitement
  const isFree = userRole === 'collaborateur' || userRole === 'admin'

  async function handleReservation() {
    if (!isLoggedIn) { router.push('/connexion'); return }

    if (!reserved) {
      if (isFree) {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        // Vérifie si une réservation existe déjà (ex: annulée)
        const { data: existing } = await supabase
          .from('reservations')
          .select('id')
          .eq('atelier_id', atelier.id)
          .eq('user_id', user.id)
          .maybeSingle()

        let error
        if (existing) {
          const res = await supabase
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('id', existing.id)
          error = res.error
        } else {
          const res = await supabase
            .from('reservations')
            .insert({ atelier_id: atelier.id, user_id: user.id, status: 'confirmed' })
          error = res.error
        }

        if (!error) {
          setReserved(true)
          router.refresh()
        }
        setLoading(false)
        return
      }
      setShowPayment(true)
      return
    }

    // Annulation de réservation
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    await supabase.from('reservations').update({ status: 'cancelled' })
      .eq('atelier_id', atelier.id).eq('user_id', user.id)
    setReserved(false)
    setLoading(false)
    router.refresh()
  }

  function handlePaymentSuccess() {
    setShowPayment(false)
    setReserved(true)
    router.refresh()
  }

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onClick={() => canViewParticipants && setShowParticipants(true)}
        className={`w-full rounded-2xl border bg-white flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 min-h-[260px] ${
          canViewParticipants ? 'cursor-pointer' : ''
        } ${reserved ? 'ring-2 ring-[var(--primary)] ring-offset-2' : 'border-[var(--border)]'}`}
      >
        <div className={`h-1.5 ${isTravail ? 'bg-[var(--travail)]' : 'bg-[var(--detente)]'}`} />

        <div className="p-4 flex flex-col gap-3 flex-1">
          <span className={`self-start text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            isTravail
              ? 'bg-[var(--travail-light)] text-[var(--travail)]'
              : 'bg-[var(--detente-light)] text-[var(--detente)]'
          }`}>
            {isTravail ? 'Professionnel' : 'Ludique'}
          </span>

          <p className="text-sm font-bold text-[var(--foreground)] leading-snug">{atelier.title}</p>

          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            {atelier.start_time.slice(0, 5)} – {atelier.end_time.slice(0, 5)}
          </div>

          {atelier.users?.full_name && (
            <button
              onClick={e => { e.stopPropagation(); setShowAnimateur(true) }}
              className="flex items-center gap-1.5 group w-fit"
            >
              <div className="w-5 h-5 rounded-full bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-[var(--primary)]">
                  {atelier.users.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-[var(--muted)] truncate group-hover:text-[var(--primary)] group-hover:underline transition-colors">
                {atelier.users.full_name}
              </span>
            </button>
          )}

          <div className="mt-auto">
            {price > 0 && (
              <div className="mb-2 flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--muted)]">Tarif</span>
                  {!isLoggedIn ? (
                    <span className="text-sm font-bold text-[var(--primary)]">{price.toFixed(2)} €</span>
                  ) : isFree ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--muted)] line-through">{price.toFixed(2)} €</span>
                      <span className="text-xs font-bold text-green-600">Gratuit</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-[var(--primary)]">{price.toFixed(2)} €</span>
                  )}
                </div>
                {!isLoggedIn && (
                  <p className="text-[10px] text-[var(--muted)] italic text-right">tarif non adhérent</p>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[var(--muted)]" />
                <span className={`text-xs font-medium ${
                  isFull ? 'text-red-500' : spotsRemaining <= 3 ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                }`}>
                  {isFull ? 'Complet' : `${spotsRemaining} place${spotsRemaining > 1 ? 's' : ''}`}
                </span>
              </div>
              <span className="text-xs text-[var(--muted)]">{atelier.max_participants} max</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFull ? 'bg-red-400' : spotsRemaining <= 3 ? 'bg-[var(--accent)]' : isTravail ? 'bg-[var(--travail)]' : 'bg-[var(--detente)]'
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={e => { e.stopPropagation(); handleReservation() }}
            disabled={loading || (isFull && !reserved)}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 ${
              reserved
                ? 'bg-[var(--primary-light)] text-[var(--primary)] hover:bg-red-50 hover:text-red-500 border border-[var(--primary-light)]'
                : isFull
                ? 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'
                : isFree
                ? 'bg-green-500 text-white hover:opacity-90'
                : isTravail
                ? 'bg-[var(--travail)] text-white hover:opacity-90'
                : 'bg-[var(--detente)] text-white hover:opacity-90'
            }`}
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : reserved ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Réservé · Annuler</>
            ) : isFull ? (
              'Complet'
            ) : isLoggedIn ? (
              isFree ? "S'inscrire gratuitement" : 'Réserver ma place'
            ) : (
              'Se connecter'
            )}
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="animate-scale-in fixed z-50 bg-white rounded-xl border border-[var(--border)] shadow-xl overflow-hidden w-44"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {!confirmDelete ? (
            <>
              {canEdit && (
                <button
                  onClick={() => { closeMenu(); router.push(`/ateliers/${atelier.id}/modifier`) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-[var(--muted)]" />
                  Modifier
                </button>
              )}
              {canEdit && canDelete && <div className="border-t border-[var(--border)]" />}
              {canDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              )}
            </>
          ) : (
            <div className="p-3 flex flex-col gap-2">
              <p className="text-xs text-[var(--foreground)] font-medium text-center">Supprimer cet atelier ?</p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {deleting
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Confirmer'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:bg-[var(--background)] transition-colors"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {showParticipants && (
        <ParticipantsModal atelier={atelier} onClose={() => setShowParticipants(false)} />
      )}

      {showAnimateur && atelier.users && (
        <AnimateurModal animateur={atelier.users} theme={atelier.theme} onClose={() => setShowAnimateur(false)} />
      )}

      {showPayment && (
        <PaymentModal
          atelier={{ ...atelier, price }}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  )
}
