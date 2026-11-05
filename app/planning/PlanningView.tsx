'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, parseISO, isSameWeek, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, eachDayOfInterval, getWeek, isBefore, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Lock, Plus } from 'lucide-react'
import AtelierCard from './AtelierCard'
import DayActionModal from './DayActionModal'
import type { Atelier, Indisponibilite } from '@/types'

interface Props {
  ateliers: Atelier[]
  userReservations: string[]
  userPendingPayments: string[]
  paymentNotice: 'cancelled' | 'error' | null
  isLoggedIn: boolean
  userRole: string | null
  userId: string | null
  // Indisponibilités de la salle (vides pour les collaborateurs, participants, visiteurs)
  indispos: Indisponibilite[]
  isSuperAdmin: boolean
}

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAY_NAMES_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

type ViewMode = 'week' | 'month'

export default function PlanningView({ ateliers, userReservations, userPendingPayments, paymentNotice, isLoggedIn, userRole, userId, indispos, isSuperAdmin }: Props) {
  const router = useRouter()
  // Fenêtre du super admin : jour cliqué, ou indisponibilité à modifier
  const [modal, setModal] = useState<{ date: string; indispo?: Indisponibilite } | null>(null)
  // Admins et animateurs peuvent cliquer sur un jour à venir pour créer
  const canCreate = userRole === 'admin' || userRole === 'animateur'
  const todayStart = startOfDay(new Date())
  const [notice, setNotice] = useState(paymentNotice)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const isCurrentMonth = isSameMonth(currentMonth, new Date())

  // Calcul des semaines du mois
  const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const weeks: Date[][] = []
  let weekStart2 = firstWeekStart
  while (weekStart2 <= monthEnd) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(weekStart2, i)))
    weekStart2 = addDays(weekStart2, 7)
  }

  const getAteliersForDay = (day: Date) =>
    ateliers.filter(a => isSameDay(parseISO(a.date), day))

  const getIndisposForDay = (day: Date) =>
    indispos.filter(i => isSameDay(parseISO(i.date), day))

  const isClickable = (day: Date) => canCreate && !isBefore(day, todayStart)

  // Clic sur un jour : fenêtre de choix (super admin) ou formulaire d'atelier
  function openDay(day: Date) {
    if (!isClickable(day)) return
    const iso = format(day, 'yyyy-MM-dd')
    if (isSuperAdmin) setModal({ date: iso })
    else router.push(`/ateliers/nouveau?date=${iso}`)
  }

  // Ce qui est déjà prévu un jour donné (rappel dans la fenêtre)
  function dayItemsFor(iso: string) {
    const day = parseISO(iso)
    return [
      ...getAteliersForDay(day).map(a => ({ id: a.id, title: a.title, start_time: a.start_time, end_time: a.end_time })),
      ...getIndisposForDay(day).map(i => ({ id: i.id, title: i.motif ?? 'Indisponible', start_time: i.start_time, end_time: i.end_time })),
    ].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  // Bloc gris « Indisponible » : motif pour les admins, cliquable pour le super admin
  const indispoBlock = (ind: Indisponibilite) => {
    const hours = ind.all_day ? 'Toute la journée' : `${ind.start_time.slice(0, 5)} – ${ind.end_time.slice(0, 5)}`
    const content = (
      <>
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#4b504d]">
          <Lock className="w-3 h-3" />
          {ind.motif ? 'Salle indisponible' : 'Indisponible'}
        </span>
        {ind.motif && <span className="text-sm font-semibold text-[var(--foreground)] leading-snug break-words">{ind.motif}</span>}
        <span className="text-xs text-[#4b504d]">{hours}</span>
      </>
    )
    const className = 'w-full text-left rounded-2xl border border-dashed border-[#b9bdba] p-3 flex flex-col gap-1 bg-[repeating-linear-gradient(135deg,#eef0ef_0_10px,#e5e8e6_10px_20px)]'
    return isSuperAdmin ? (
      <button
        key={ind.id}
        type="button"
        onClick={() => setModal({ date: ind.date, indispo: ind })}
        className={`${className} hover:border-[var(--foreground)] transition-colors`}
        aria-label={`Modifier l’indisponibilité du ${format(parseISO(ind.date), 'd MMMM', { locale: fr })}`}
      >
        {content}
      </button>
    ) : (
      <div key={ind.id} className={className}>{content}</div>
    )
  }

  // En-tête d'un jour : cliquable pour créer (admins et animateurs, jours à venir)
  const dayHeader = (day: Date, i: number, atelierCount: number) => {
    const todayDay = isToday(day)
    const inner = (
      <>
        <p className={`text-xs font-semibold uppercase tracking-wide ${todayDay ? 'text-white/80' : 'text-[var(--muted)]'}`}>
          {DAY_NAMES[i]}
        </p>
        <p className={`text-xl font-bold mt-0.5 ${todayDay ? 'text-white' : 'text-[var(--foreground)]'}`}>
          {format(day, 'd')}
        </p>
        {atelierCount > 0 && (
          <p className={`text-xs mt-0.5 ${todayDay ? 'text-white/70' : 'text-[var(--muted)]'}`}>
            {atelierCount} atelier{atelierCount > 1 ? 's' : ''}
          </p>
        )}
      </>
    )
    const base = `text-center py-3 px-2 rounded-2xl border ${
      todayDay ? 'bg-[var(--primary)] border-[var(--primary)]' : 'bg-white border-[var(--border)]'
    }`
    if (!isClickable(day)) return <div className={base}>{inner}</div>
    return (
      <button
        type="button"
        onClick={() => openDay(day)}
        title={isSuperAdmin ? 'Ajouter un atelier ou une indisponibilité' : 'Proposer un atelier ce jour-là'}
        aria-label={`Ajouter le ${format(day, 'EEEE d MMMM', { locale: fr })}`}
        className={`${base} group relative w-full cursor-pointer hover:ring-2 hover:ring-[var(--primary)] hover:ring-offset-1 transition-shadow`}
      >
        <Plus className={`absolute top-2 right-2 w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${todayDay ? 'text-white' : 'text-[var(--primary)]'}`} />
        {inner}
      </button>
    )
  }

  // Contenu d'un jour : ateliers et indisponibilités par heure de début
  const dayContent = (day: Date, dayAteliers: Atelier[]) => {
    const dayIndispos = getIndisposForDay(day)
    if (dayAteliers.length === 0 && dayIndispos.length === 0) {
      return isClickable(day) ? (
        <button
          type="button"
          onClick={() => openDay(day)}
          className="group flex-1 min-h-[260px] rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center hover:border-[var(--primary)] transition-colors cursor-pointer"
        >
          <span className="text-xs text-[var(--muted)] opacity-40 group-hover:hidden">Aucun atelier</span>
          <span className="text-xs font-medium text-[var(--primary)] hidden group-hover:flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Ajouter</span>
        </button>
      ) : (
        <div className="flex-1 min-h-[260px] rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center">
          <span className="text-xs text-[var(--muted)] opacity-40">Aucun atelier</span>
        </div>
      )
    }
    const items = [
      ...dayAteliers.map(a => ({ key: a.start_time, node: atelierCard(a) })),
      ...dayIndispos.map(ind => ({ key: ind.start_time, node: indispoBlock(ind) })),
    ].sort((a, b) => a.key.localeCompare(b.key))
    return <div className="flex flex-col gap-2 flex-1">{items.map(it => it.node)}</div>
  }

  const modalEl = modal && (
    <DayActionModal
      date={modal.date}
      indispo={modal.indispo}
      dayItems={dayItemsFor(modal.date)}
      onClose={() => setModal(null)}
    />
  )

  function toggleView() {
    if (viewMode === 'week') {
      setCurrentMonth(currentWeek)
      setViewMode('month')
    } else {
      setViewMode('week')
    }
  }

  const atelierCard = (atelier: Atelier) => (
    <AtelierCard
      key={atelier.id}
      atelier={atelier}
      isReserved={userReservations.includes(atelier.id)}
      isPendingPayment={userPendingPayments.includes(atelier.id)}
      isLoggedIn={isLoggedIn}
      userRole={userRole}
      // Noms et emails des participants : admins et animateur de l'atelier uniquement
      canViewParticipants={userRole === 'admin' || (userRole === 'animateur' && atelier.animateur_id === userId)}
      canEdit={userRole === 'admin'}
      canDelete={userRole === 'admin' || (userRole === 'animateur' && atelier.animateur_id === userId)}
    />
  )

  const legend = (
    <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-6 mt-6 pt-4 border-t border-[var(--border)]">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-[var(--travail)]" />
        <span className="text-xs text-[var(--muted)]">Atelier Professionnel</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-[var(--detente)]" />
        <span className="text-xs text-[var(--muted)]">Atelier Ludique</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-[var(--accent)]" />
        <span className="text-xs text-[var(--muted)]">Moins de 3 places</span>
      </div>
      {!isLoggedIn && (
        <div className="w-full text-center mt-1">
          <a href="/connexion" className="text-xs text-[var(--primary)] font-medium hover:underline">Connectez-vous</a>
          <span className="text-xs text-[var(--muted)]"> pour réserver</span>
        </div>
      )}
    </div>
  )

  /* ── VUE SEMAINE ── */
  if (viewMode === 'week') {
    return (
      <div>
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-2xl border border-[var(--border)] px-4 py-3 sm:px-5 sm:py-4">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--background)] transition-colors border border-[var(--border)]"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--muted)]" />
          </button>
          <div className="text-center">
            <p className="text-base sm:text-lg font-bold text-[var(--foreground)] capitalize">
              {format(weekStart, 'MMMM yyyy', { locale: fr })}
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5 flex items-center justify-center gap-2 flex-wrap">
              {format(weekStart, 'd')} – {format(addDays(weekStart, 6), 'd MMMM', { locale: fr })}
              {isCurrentWeek && (
                <button
                  onClick={toggleView}
                  className="px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-medium hover:bg-[var(--primary)] hover:text-white transition-colors"
                >
                  Cette semaine
                </button>
              )}
            </p>
          </div>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--background)] transition-colors border border-[var(--border)]"
          >
            <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
          </button>
        </div>

        {/* Mobile : liste */}
        <div className="md:hidden flex flex-col gap-4">
          {weekDays.map((day, i) => {
            const dayAteliers = getAteliersForDay(day)
            const dayIndispos = getIndisposForDay(day)
            // Jours vides masqués, sauf pour ceux qui peuvent y ajouter quelque chose
            if (dayAteliers.length === 0 && dayIndispos.length === 0 && !isClickable(day)) return null
            const todayDay = isToday(day)
            return (
              <div key={day.toISOString()}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    todayDay ? 'bg-[var(--primary)] text-white' : 'bg-[var(--border)] text-[var(--muted)]'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <p className={`text-sm font-semibold capitalize ${todayDay ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                    {DAY_NAMES_FULL[i]}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {dayAteliers.map(a => atelierCard(a))}
                  {dayIndispos.map(ind => indispoBlock(ind))}
                  {isClickable(day) && (
                    <button
                      type="button"
                      onClick={() => openDay(day)}
                      className="flex items-center justify-center gap-1.5 py-3 rounded-2xl border-2 border-dashed border-[var(--border)] text-sm font-medium text-[var(--primary)]"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {!canCreate && weekDays.every(day => getAteliersForDay(day).length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[var(--muted)] text-sm">Aucun atelier cette semaine</p>
            </div>
          )}
        </div>

        {/* Desktop : grille 7 colonnes */}
        <div className="hidden md:grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => {
            const dayAteliers = getAteliersForDay(day)
            return (
              <div key={day.toISOString()} className="flex flex-col gap-2 min-w-0">
                {dayHeader(day, i, dayAteliers.length)}
                {dayContent(day, dayAteliers)}
              </div>
            )
          })}
        </div>

        {legend}
        {modalEl}
      </div>
    )
  }

  /* ── VUE MOIS ── */
  return (
    <div>
      {notice && (
        <div className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
          notice === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          <span>
            {notice === 'error'
              ? 'Un problème est survenu avec le paiement. Si vous avez été débité, contactez-nous.'
              : 'Paiement annulé : aucun montant n’a été débité et la place a été libérée.'}
          </span>
          <button onClick={() => setNotice(null)} className="font-semibold opacity-70 hover:opacity-100" aria-label="Fermer">×</button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-2xl border border-[var(--border)] px-4 py-3 sm:px-5 sm:py-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--background)] transition-colors border border-[var(--border)]"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--muted)]" />
        </button>
        <div className="text-center">
          <p className="text-base sm:text-lg font-bold text-[var(--foreground)] capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </p>
          <p className="text-xs text-[var(--muted)] mt-0.5 flex items-center justify-center gap-2">
            <button
              onClick={toggleView}
              className="px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-medium hover:bg-[var(--primary)] hover:text-white transition-colors"
            >
              {isCurrentMonth ? 'Ce mois-ci' : 'Vue mois'}
            </button>
          </p>
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--background)] transition-colors border border-[var(--border)]"
        >
          <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
        </button>
      </div>

      {/* Grille mensuelle — même format que la vue semaine */}
      <div className="flex flex-col gap-6">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-3">
            {week.map((day, i) => {
              const dayAteliers = getAteliersForDay(day)
              const inMonth = isSameMonth(day, currentMonth)

              return (
                <div key={day.toISOString()} className={`flex flex-col gap-2 min-w-0 ${!inMonth ? 'opacity-30' : ''}`}>
                  {dayHeader(day, i, dayAteliers.length)}
                  {dayContent(day, dayAteliers)}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {legend}
      {modalEl}
    </div>
  )
}
