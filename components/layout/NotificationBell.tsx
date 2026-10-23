'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, User, Calendar, CalendarCheck, CreditCard, UserCheck, Building2, Mail, Phone, MapPin, Globe, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  created_at: string
  metadata: Record<string, string>
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Notification | null>(null)
  const supabase = createClient()
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications((data ?? []) as Notification[])
  }

  useEffect(() => {
    fetchNotifications()
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function handleClick(n: Notification) {
    setOpen(false)
    // Atelier proposé par un animateur : direction la page de validation
    if (n.type === 'atelier_pending') {
      if (!n.is_read) await markRead(n.id)
      window.location.href = '/admin/validation'
      return
    }
    if (!n.is_read) markRead(n.id)
    setSelected(n)
  }

  function getIcon(type: string) {
    switch (type) {
      case 'new_user': return <User className="w-3.5 h-3.5" />
      case 'reservation': return <Calendar className="w-3.5 h-3.5" />
      case 'payment': return <CreditCard className="w-3.5 h-3.5" />
      case 'candidature_animateur': return <UserCheck className="w-3.5 h-3.5" />
      case 'candidature_entreprise': return <Building2 className="w-3.5 h-3.5" />
      case 'atelier_pending': return <CalendarCheck className="w-3.5 h-3.5" />
      default: return <Bell className="w-3.5 h-3.5" />
    }
  }

  function getIconStyle(type: string) {
    switch (type) {
      case 'new_user': return 'bg-blue-50 text-blue-500'
      case 'reservation': return 'bg-green-50 text-green-500'
      case 'payment': return 'bg-amber-50 text-amber-600'
      case 'candidature_animateur': return 'bg-purple-50 text-purple-500'
      case 'candidature_entreprise': return 'bg-orange-50 text-orange-500'
      case 'atelier_pending': return 'bg-amber-50 text-amber-600'
      default: return 'bg-[var(--primary-light)] text-[var(--primary)]'
    }
  }

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="relative p-2 rounded-xl hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors ml-1"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="animate-slide-up absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[var(--border)] shadow-xl overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-sm text-[var(--foreground)]">
                Notifications {unreadCount > 0 && <span className="text-xs font-normal text-[var(--muted)]">({unreadCount} non lues)</span>}
              </h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-[var(--border)] text-[var(--muted)] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border)]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-8 h-8 text-[var(--muted)] opacity-30 mb-2" />
                  <p className="text-sm text-[var(--muted)]">Aucune notification</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--background)] ${!n.is_read ? 'bg-[var(--primary-light)]/40' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${getIconStyle(n.type)}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)]">{n.title}</p>
                      {n.message && <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-[var(--muted)] mt-1">
                        {format(parseISO(n.created_at), "d MMM à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0 mt-2" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modale de détail — via Portal pour éviter le stacking context de la navbar */}
      {selected && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm bg-black/30 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconStyle(selected.type)}`}>
                  {getIcon(selected.type)}
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--foreground)]">{selected.title}</p>
                  <p className="text-xs text-[var(--muted)]">{format(parseISO(selected.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--muted)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu selon le type */}
            <div className="p-5 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
              {selected.message && (
                <p className="text-sm text-[var(--muted)] leading-relaxed">{selected.message}</p>
              )}

              {(selected.type === 'candidature_animateur' || selected.type === 'candidature_entreprise') && (
                <div className="flex flex-col gap-2.5 mt-1">
                  {selected.metadata.nom && (
                    <InfoLine icon={User} label="Nom" value={selected.metadata.nom} />
                  )}
                  {selected.metadata.email && (
                    <InfoLine icon={Mail} label="Email" value={selected.metadata.email} href={`mailto:${selected.metadata.email}`} />
                  )}
                  {selected.metadata.telephone && (
                    <InfoLine icon={Phone} label="Téléphone" value={selected.metadata.telephone} href={`tel:${selected.metadata.telephone}`} />
                  )}
                  {selected.metadata.specialite && (
                    <InfoLine icon={UserCheck} label="Spécialité" value={selected.metadata.specialite} />
                  )}
                  {selected.metadata.adresse && (
                    <InfoLine icon={MapPin} label="Adresse" value={selected.metadata.adresse} />
                  )}
                  {selected.metadata.site_web && (
                    <InfoLine icon={Globe} label="Site web" value={selected.metadata.site_web} href={selected.metadata.site_web} />
                  )}
                  {selected.metadata.motivation && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[var(--muted)]" />
                        <span className="text-xs font-medium text-[var(--muted)]">Motivation</span>
                      </div>
                      <p className="text-sm text-[var(--foreground)] leading-relaxed bg-[var(--background)] rounded-xl px-3 py-2.5">
                        {selected.metadata.motivation}
                      </p>
                    </div>
                  )}
                  {selected.metadata.description && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[var(--muted)]" />
                        <span className="text-xs font-medium text-[var(--muted)]">Description</span>
                      </div>
                      <p className="text-sm text-[var(--foreground)] leading-relaxed bg-[var(--background)] rounded-xl px-3 py-2.5">
                        {selected.metadata.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(selected.type === 'new_user' || selected.type === 'reservation' || selected.type === 'payment') && (
                <div className="flex flex-col gap-2.5 mt-1">
                  {selected.metadata.email && (
                    <InfoLine icon={Mail} label="Email" value={selected.metadata.email} href={`mailto:${selected.metadata.email}`} />
                  )}
                  {selected.metadata.role && (
                    <InfoLine icon={User} label="Rôle" value={selected.metadata.role} />
                  )}
                  {selected.metadata.payment_id && (
                    <InfoLine icon={CreditCard} label="Paiement" value={selected.metadata.payment_id} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </>
  )
}

function InfoLine({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-[var(--muted)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[var(--muted)]">{label}</p>
        {href ? (
          <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
            className="text-sm text-[var(--primary)] hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-sm text-[var(--foreground)] truncate">{value}</p>
        )}
      </div>
    </div>
  )
}
