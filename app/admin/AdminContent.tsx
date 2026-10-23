'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ShieldCheck, Trash2, AlertTriangle, UserPlus, Search, Loader2, Phone, Mail, Building2, User as UserIcon, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import type { User } from '@/types'

interface Props {
  admins: User[]
  animateurs: User[]
  participants: User[]
  collaborateurs: User[]
  isSuperAdmin?: boolean
  currentUserId?: string
}

export default function AdminContent({ admins, animateurs, participants, collaborateurs, isSuperAdmin = false, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Gestion ajout admin
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)

  // Création d'un animateur
  const [showAddAnimateur, setShowAddAnimateur] = useState(false)

  async function searchUsers(query: string) {
    setSearchQuery(query)
    if (query.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('users')
      .select('*')
      .neq('role', 'admin')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(8)
    setSearchResults(data ?? [])
    setSearching(false)
  }

  async function promoteToAdmin(userId: string) {
    await supabase.from('users').update({ role: 'admin' }).eq('id', userId)
    setShowAddAdmin(false)
    setSearchQuery('')
    setSearchResults([])
    router.refresh()
  }

  async function exportEmails() {
    const { data } = await supabase.from('users').select('email').order('email')
    if (!data) return
    const emails = data.map(u => u.email).join('\n')
    const blob = new Blob([emails], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `emails-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function demoteAdmin(userId: string) {
    if (!confirm('Retirer les droits administrateur à cet utilisateur ?')) return
    await supabase.from('users').update({ role: 'participant' }).eq('id', userId)
    router.refresh()
  }

  async function toggleActive(user: User) {
    await supabase
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)
    router.refresh()
  }

  async function changeRole(userId: string, newRole: 'animateur' | 'participant' | 'collaborateur') {
    await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
    router.refresh()
  }

  async function confirmDelete(user: User) {
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
    if (res.ok) {
      setUserToDelete(null)
      router.refresh()
    } else {
      const { error } = await res.json()
      alert(`Erreur : ${error}`)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-8">Administration</h1>

      <div className="grid grid-cols-1 gap-6">
        {/* Administrateurs */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[var(--foreground)] leading-none">Administrateurs ({admins.length})</h2>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 leading-none">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                Sécurisé
              </span>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => setShowAddAdmin(o => !o)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            )}
          </div>

          {/* Recherche ajout admin */}
          {isSuperAdmin && showAddAdmin && (
            <div className="mb-4 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => searchUsers(e.target.value)}
                  placeholder="Rechercher un utilisateur..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] animate-spin" />}
              </div>
              {searchResults.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-white">
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] last:border-0">
                      <div className="w-7 h-7 rounded-full bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-[var(--primary)]">{u.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{u.full_name}</p>
                        <p className="text-xs text-[var(--muted)] truncate">{u.email}</p>
                      </div>
                      <button
                        onClick={() => promoteToAdmin(u.id)}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors flex-shrink-0"
                      >
                        <UserPlus className="w-3 h-3" />
                        Promouvoir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            {admins.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Aucun administrateur.</p>
            ) : (
              admins.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-[var(--accent)]">{u.full_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setSelectedUser(u)} className="text-sm font-medium text-[var(--foreground)] truncate flex items-center gap-1.5 hover:text-[var(--primary)] hover:underline text-left">
                      {u.full_name}
                      {u.is_super_admin && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">Principal</span>
                      )}
                    </button>
                    <p className="text-xs text-[var(--muted)] truncate">{u.email}</p>
                  </div>
                  {isSuperAdmin && !u.is_super_admin && u.id !== currentUserId && (
                    <button
                      onClick={() => demoteAdmin(u.id)}
                      className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Retirer admin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Animateurs */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--foreground)] leading-none">
              Animateurs ({animateurs.length})
            </h2>
            <button
              onClick={() => setShowAddAnimateur(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {animateurs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Aucun animateur.</p>
            ) : (
              animateurs.map(user => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <button onClick={() => setSelectedUser(user)} className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] hover:underline text-left">{user.full_name}</button>
                    <p className="text-xs text-[var(--muted)]">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(user)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        user.is_active
                          ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                          : 'bg-red-50 text-red-500'
                      }`}
                    >
                      {user.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </button>
                    <RoleSelect
                      user={user}
                      onChangeRole={(newRole) => changeRole(user.id, newRole)}
                    />
                    <DeleteButton user={user} onDelete={setUserToDelete} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Collaborateurs */}
      <Card className="p-5 mt-6">
        <h2 className="font-semibold text-[var(--foreground)] mb-4">
          Collaborateurs ({collaborateurs.length})
        </h2>
        <div className="flex flex-col gap-1">
          {collaborateurs.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Aucun collaborateur.</p>
          ) : (
            collaborateurs.map(user => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-green-700">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <button onClick={() => setSelectedUser(user)} className="text-sm font-medium text-[var(--foreground)] truncate hover:text-[var(--primary)] hover:underline text-left">{user.full_name}</button>
                    <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RoleSelect
                    user={user}
                    onChangeRole={(newRole) => changeRole(user.id, newRole)}
                  />
                  <DeleteButton user={user} onDelete={setUserToDelete} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Participants */}
      <Card className="p-5 mt-6">
        <h2 className="font-semibold text-[var(--foreground)] mb-4">
          Inscrits ({participants.length})
        </h2>
        <div className="flex flex-col gap-1">
          {participants.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Aucun participant.</p>
          ) : (
            participants.map(user => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-[var(--primary)]">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <button onClick={() => setSelectedUser(user)} className="text-sm font-medium text-[var(--foreground)] truncate hover:text-[var(--primary)] hover:underline text-left">{user.full_name}</button>
                    <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RoleSelect
                    user={user}
                    onChangeRole={(newRole) => changeRole(user.id, newRole)}
                  />
                  <DeleteButton user={user} onDelete={setUserToDelete} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Export emails — super admin uniquement */}
      {isSuperAdmin && (
        <div className="flex justify-end mt-6">
          <button
            onClick={exportEmails}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter les emails
          </button>
        </div>
      )}

      {selectedUser && (
        <UserContactModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {showAddAnimateur && (
        <AddAnimateurModal
          onClose={() => setShowAddAnimateur(false)}
          onCreated={() => router.refresh()}
        />
      )}

      {userToDelete && (
        <DeleteConfirmModal
          user={userToDelete}
          onConfirm={() => confirmDelete(userToDelete)}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  )
}

function RoleSelect({
  user,
  onChangeRole,
}: {
  user: User
  onChangeRole: (newRole: 'animateur' | 'participant' | 'collaborateur') => void
}) {
  const [value, setValue] = useState(user.role as 'animateur' | 'participant' | 'collaborateur')

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as 'animateur' | 'participant' | 'collaborateur'
    const confirmed = window.confirm(
      `Changer le rôle de ${user.full_name} en "${newRole}" ?`
    )
    if (!confirmed) return
    setValue(newRole)
    onChangeRole(newRole)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      className="text-xs px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition"
    >
      <option value="participant">Inscrit</option>
      <option value="collaborateur">Collaborateur</option>
      <option value="animateur">Animateur</option>
    </select>
  )
}

function DeleteButton({ user, onDelete }: { user: User; onDelete: (u: User) => void }) {
  return (
    <button
      onClick={() => onDelete(user)}
      className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
      title="Supprimer"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}

function DeleteConfirmModal({
  user,
  onConfirm,
  onCancel,
}: {
  user: User
  onConfirm: () => void
  onCancel: () => void
}) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const matches = input.trim().toLowerCase() === user.full_name.trim().toLowerCase()

  async function handleConfirm() {
    if (!matches) return
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/30 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-[var(--foreground)]">Supprimer l'utilisateur</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Cette action est <span className="font-semibold text-red-500">irréversible</span>. Toutes les données associées seront supprimées.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted)]">
            Tapez <span className="font-bold text-[var(--foreground)]">{user.full_name}</span> pour confirmer
          </label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            placeholder={user.full_name}
            autoFocus
            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-red-300 transition"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!matches || loading}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddAnimateurModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdEmail, setCreatedEmail] = useState('')

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'animateur' }),
    })
    setLoading(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      setError(error)
      return
    }
    setCreatedEmail(form.email.trim())
    onCreated()
  }

  const inputClass = 'w-full px-3 py-2 rounded-xl border border-[var(--border)] text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[var(--foreground)]">Nouvel animateur</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--muted)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdEmail ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Compte animateur créé pour <span className="font-semibold">{createdEmail}</span>.
              </p>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Pour se connecter la première fois, la personne doit cliquer sur
              <span className="font-medium text-[var(--foreground)]"> « Mot de passe oublié »</span> sur la page de connexion
              et saisir cet email : elle recevra un lien pour choisir son mot de passe.
            </p>
            <button
              onClick={onClose}
              className="py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Nom complet <span className="text-red-500">*</span></label>
              <input type="text" value={form.full_name} onChange={set('full_name')} required autoFocus className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={set('email')} required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Téléphone <span className="text-xs text-[var(--muted)] font-normal">(optionnel)</span></label>
              <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function UserContactModal({ user, onClose }: { user: User; onClose: () => void }) {
  const roleLabel: Record<string, string> = {
    admin: 'Administrateur',
    animateur: 'Animateur',
    collaborateur: 'Collaborateur',
    participant: 'Inscrit',
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-[var(--primary)]">{user.full_name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-[var(--foreground)]">{user.full_name}</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--muted)]">
                {roleLabel[user.role] ?? user.role}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--muted)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Infos */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
              <Mail className="w-3.5 h-3.5 text-[var(--muted)]" />
            </div>
            <a href={`mailto:${user.email}`} className="text-sm text-[var(--primary)] hover:underline truncate">{user.email}</a>
          </div>

          {user.phone ? (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                <Phone className="w-3.5 h-3.5 text-[var(--muted)]" />
              </div>
              <a href={`tel:${user.phone}`} className="text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">{user.phone}</a>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                <Phone className="w-3.5 h-3.5 text-[var(--muted)]" />
              </div>
              <span className="text-sm text-[var(--muted)] italic">Aucun téléphone</span>
            </div>
          )}

          {user.organisme ? (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 text-[var(--muted)]" />
              </div>
              <span className="text-sm text-[var(--foreground)]">{user.organisme}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
