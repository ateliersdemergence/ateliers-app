'use client'

import { addMonths, endOfMonth, endOfWeek, format, isBefore, isSameDay, isSameMonth, parseISO, startOfDay, startOfMonth, startOfWeek, subMonths, eachDayOfInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface Creneau {
  id: string
  date: string
  start_time: string
  end_time: string
  title: string
  status: 'pending' | 'approved'
  animateur_name: string | null
  is_mine: boolean
}

interface Props {
  month: Date
  onMonthChange: (month: Date) => void
  selectedDate: string
  onSelectDate: (date: string) => void
  creneaux: Creneau[]
  loading?: boolean
}

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Calendrier du mois : un point par atelier déjà prévu, jours passés grisés
export default function MiniPlanning({ month, onMonthChange, selectedDate, onSelectDate, creneaux, loading }: Props) {
  const today = startOfDay(new Date())
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
  const selected = selectedDate ? parseISO(selectedDate) : null
  const canGoBack = !isBefore(startOfMonth(subMonths(month, 1)), startOfMonth(today))

  return (
    <div className="rounded-2xl border border-[var(--border)] p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(month, 1))}
          disabled={!canGoBack}
          className="p-1.5 rounded-lg hover:bg-[var(--background)] text-[var(--muted)] disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-[var(--foreground)] capitalize">
          {format(month, 'MMMM yyyy', { locale: fr })}
          {loading && <span className="ml-2 inline-block w-3 h-3 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin align-middle" />}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="p-1.5 rounded-lg hover:bg-[var(--background)] text-[var(--muted)]"
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK_DAYS.map((d, i) => (
          <span key={i} className="text-[10px] font-semibold text-[var(--muted)] py-1">{d}</span>
        ))}

        {days.map(day => {
          const iso = format(day, 'yyyy-MM-dd')
          const dayCreneaux = creneaux.filter(c => c.date === iso)
          const past = isBefore(day, today)
          const outside = !isSameMonth(day, month)
          const isSelected = selected ? isSameDay(day, selected) : false

          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              onClick={() => onSelectDate(iso)}
              className={`relative h-10 rounded-lg text-sm transition-colors flex flex-col items-center justify-center ${
                isSelected
                  ? 'bg-[var(--primary)] text-white font-semibold'
                  : past
                  ? 'text-[var(--muted)] opacity-40 cursor-not-allowed'
                  : outside
                  ? 'text-[var(--muted)] hover:bg-[var(--background)]'
                  : 'text-[var(--foreground)] hover:bg-[var(--primary-light)]'
              }`}
            >
              {format(day, 'd')}
              {dayCreneaux.length > 0 && (
                <span className="flex gap-0.5 mt-0.5">
                  {dayCreneaux.slice(0, 3).map(c => (
                    <span
                      key={c.id}
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? 'bg-white' : c.status === 'pending' ? 'bg-amber-400' : 'bg-[var(--primary)]'
                      }`}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mt-2 px-1 text-[11px] text-[var(--muted)]">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />Atelier validé</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />En attente de validation</span>
      </div>
    </div>
  )
}

// Chevauchement entre deux créneaux "HH:MM" (ou "HH:MM:SS")
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const n = (t: string) => t.slice(0, 5)
  return n(aStart) < n(bEnd) && n(aEnd) > n(bStart)
}
