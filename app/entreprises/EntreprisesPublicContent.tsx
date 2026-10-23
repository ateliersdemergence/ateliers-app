'use client'

import { useState } from 'react'
import { Building2, Mail, Phone, MapPin, X, Users, Globe } from 'lucide-react'

interface Entreprise {
  id: string
  name: string
  logo_url: string | null
  banner_url: string | null
  address: string | null
  contact_email: string | null
  contact_phone: string | null
  description: string | null
  website: string | null
}

interface Intervenant {
  id: string
  full_name: string
  avatar_url?: string | null
  role: string
  organisme?: string | null
  bio?: string | null
}

interface Props {
  entreprises: Entreprise[]
  intervenants: Intervenant[]
}

type Tab = 'entreprises' | 'intervenants'

function Avatar({ name, url, size = 'md', square = false }: { name: string; url?: string | null; size?: 'sm' | 'md' | 'lg'; square?: boolean }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-12 h-12 text-base'
  const shape = square ? 'rounded-2xl' : 'rounded-full'
  const base = `${dim} ${shape} flex-shrink-0 border border-[var(--border)]`
  if (url) return <img src={url} alt={name} className={`${base} object-cover`} />
  return (
    <div className={`${base} bg-[var(--primary-light)] flex items-center justify-center`}>
      <span className="font-bold text-[var(--primary)]">{name.charAt(0).toUpperCase()}</span>
    </div>
  )
}

// Page publique : coordonnées des entreprises uniquement, jamais celles des collaborateurs
export default function EntreprisesPublicContent({ entreprises, intervenants }: Props) {
  const [tab, setTab] = useState<Tab>('entreprises')
  const [selected, setSelected] = useState<Entreprise | null>(null)

  function switchTab(t: Tab) {
    setTab(t)
    setSelected(null)
  }

  return (
    <div>
      {/* Header + tabs */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-5">Entreprises & Intervenants</h1>
        <div className="grid grid-cols-2 gap-1 bg-white border border-[var(--border)] rounded-2xl p-1 w-fit">
          {([
            { key: 'entreprises', label: 'Entreprises Partenaires', icon: Building2 },
            { key: 'intervenants', label: 'Intervenants', icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu — les deux panels superposés dans la même cellule grid, seule l'opacité change */}
      <div className="grid">
        {/* Onglet Entreprises */}
        <div className={`col-start-1 row-start-1 transition-opacity duration-150 ${tab !== 'entreprises' ? 'opacity-0 pointer-events-none select-none' : ''}`}>
          {entreprises.length === 0 ? (
            <EmptyState icon={Building2} label="Aucune entreprise partenaire" sub="Les entreprises partenaires apparaîtront ici." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {entreprises.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="bg-white rounded-2xl border border-[var(--border)] p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between h-40 overflow-hidden"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={e.name} url={e.logo_url} square />
                    <p className="font-bold text-[var(--foreground)] truncate flex-1 min-w-0">{e.name}</p>
                  </div>
                  {e.description && <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">{e.description}</p>}
                  {e.address && (
                    <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{e.address}</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Onglet Intervenants */}
        <div className={`col-start-1 row-start-1 transition-opacity duration-150 ${tab !== 'intervenants' ? 'opacity-0 pointer-events-none select-none' : ''}`}>
          {intervenants.length === 0 ? (
            <EmptyState icon={Users} label="Aucun intervenant" sub="Les intervenants apparaîtront ici." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {intervenants.map(i => (
                <div key={i.id} className="bg-white rounded-2xl border border-[var(--border)] p-5 flex flex-col gap-3 h-40 overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={i.full_name} url={i.avatar_url} square />
                    <p className="font-bold text-[var(--foreground)] truncate flex-1 min-w-0">{i.full_name}</p>
                  </div>
                  {i.bio && (
                    <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">{i.bio}</p>
                  )}
                  {i.organisme && (
                    <span className="flex items-center gap-1.5 text-xs text-[var(--muted)] mt-auto">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{i.organisme}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modale détail entreprise */}
      {selected && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="animate-slide-up bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-28 flex-shrink-0 bg-[var(--primary-light)]">
              {selected.banner_url && <img src={selected.banner_url} alt="Bannière" className="w-full h-full object-cover" />}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/60 hover:bg-white/80 transition-colors"
              >
                <X className="w-4 h-4 text-[var(--foreground)]" />
              </button>
              <div className="absolute -bottom-7 left-5">
                {selected.logo_url
                  ? <img src={selected.logo_url} alt={selected.name} className="w-14 h-14 rounded-2xl object-cover border-4 border-white shadow-sm" />
                  : <div className="w-14 h-14 rounded-2xl bg-[var(--primary)] flex items-center justify-center border-4 border-white shadow-sm">
                      <span className="text-xl font-bold text-white">{selected.name.charAt(0).toUpperCase()}</span>
                    </div>
                }
              </div>
            </div>

            <div className="overflow-y-auto">
              <div className="px-5 pt-10 pb-4">
                <h2 className="text-xl font-bold text-[var(--foreground)]">{selected.name}</h2>
                {selected.description && <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{selected.description}</p>}
              </div>

              <div className="px-5 pb-4 flex flex-col gap-2.5">
                {selected.address && (
                  <InfoRow icon={MapPin}><span className="text-sm text-[var(--foreground)]">{selected.address}</span></InfoRow>
                )}
                {selected.contact_email && (
                  <InfoRow icon={Mail}>
                    <a href={`mailto:${selected.contact_email}`} className="text-sm text-[var(--primary)] hover:underline">{selected.contact_email}</a>
                  </InfoRow>
                )}
                {selected.contact_phone && (
                  <InfoRow icon={Phone}>
                    <a href={`tel:${selected.contact_phone}`} className="text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">{selected.contact_phone}</a>
                  </InfoRow>
                )}
                {selected.website && (
                  <InfoRow icon={Globe}>
                    <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--primary)] hover:underline truncate block">{selected.website.replace(/^https?:\/\//, '')}</a>
                  </InfoRow>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[var(--primary)]" />
      </div>
      <p className="text-[var(--foreground)] font-semibold">{label}</p>
      <p className="text-sm text-[var(--muted)] mt-1">{sub}</p>
    </div>
  )
}

function InfoRow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-[var(--muted)]" />
      </div>
      {children}
    </div>
  )
}
