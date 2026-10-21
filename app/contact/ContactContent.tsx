'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Mail, Phone, MapPin, Pencil, Plus, Trash2, X, Globe } from 'lucide-react'
import type { ContactInfo, ContactPerson } from '@/lib/contact'

interface Props {
  contact: ContactInfo
  isAdmin: boolean
}

const inputClass = 'w-full px-3 py-2 rounded-xl border border-[var(--border)] text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition'
const labelClass = 'block text-xs font-semibold text-[var(--muted)] mb-1'

export default function ContactContent({ contact, isAdmin }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ContactInfo>(contact)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function startEdit() {
    setForm(structuredClone(contact))
    setError('')
    setSaved(false)
    setEditing(true)
  }

  function setEspace(field: keyof ContactInfo['espace'], value: string) {
    setForm(f => ({ ...f, espace: { ...f.espace, [field]: value } }))
  }

  function setPerson(i: number, field: keyof ContactPerson, value: string) {
    setForm(f => ({
      ...f,
      contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)),
    }))
  }

  function addPerson() {
    setForm(f => ({ ...f, contacts: [...f.contacts, { name: '', email: '', phone: '' }] }))
  }

  function removePerson(i: number) {
    setForm(f => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleaned: ContactInfo = {
      espace: {
        name: form.espace.name.trim(),
        address: form.espace.address.trim(),
        phone: form.espace.phone.trim(),
        email: form.espace.email.trim(),
        website: form.espace.website.trim(),
      },
      contacts: form.contacts
        .map(c => ({
          name: c.name.trim(),
          email: c.email?.trim() || null,
          phone: c.phone?.trim() || null,
        }))
        .filter(c => c.name),
    }

    if (!cleaned.espace.name) {
      setError("Le nom de l'espace est obligatoire.")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('site_settings')
      .upsert({ key: 'contact', value: cleaned, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
    setSaving(false)

    if (err) {
      setError(err.message)
      return
    }
    setEditing(false)
    setSaved(true)
    router.refresh()
  }

  const data = contact

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Contact</h1>
          <p className="text-[var(--muted)] mt-1">Toutes les informations pour nous joindre</p>
        </div>
        {isAdmin && !editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--border)] transition cursor-pointer flex-shrink-0"
          >
            <Pencil className="w-4 h-4" />
            Modifier
          </button>
        )}
      </div>

      {saved && !editing && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-green-50 text-green-700 text-sm border border-green-200">
          Coordonnées enregistrées.
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-8">
          {/* Espace */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
            <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4">Espace de coworking</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nom *</label>
                <input className={inputClass} value={form.espace.name} onChange={e => setEspace('name', e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Adresse</label>
                <input className={inputClass} value={form.espace.address} onChange={e => setEspace('address', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input className={inputClass} type="tel" value={form.espace.phone} onChange={e => setEspace('phone', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>E-mail</label>
                <input className={inputClass} type="email" value={form.espace.email} onChange={e => setEspace('email', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Site internet</label>
                <input className={inputClass} type="url" value={form.espace.website} onChange={e => setEspace('website', e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div>
            <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4">Nos contacts</h2>
            <div className="flex flex-col gap-4">
              {form.contacts.map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[var(--border)] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Contact {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removePerson(i)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Retirer
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>Nom</label>
                      <input className={inputClass} value={c.name} onChange={e => setPerson(i, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>E-mail</label>
                      <input className={inputClass} type="email" value={c.email ?? ''} onChange={e => setPerson(i, 'email', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Téléphone</label>
                      <input className={inputClass} type="tel" value={c.phone ?? ''} onChange={e => setPerson(i, 'phone', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addPerson}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Ajouter un contact
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">{error}</div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--border)] transition cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Espace de coworking */}
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden mb-8">
            <div className="h-1.5 bg-[var(--primary)]" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Espace de coworking</p>
                  {data.espace.website ? (
                    <a
                      href={data.espace.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-bold text-[var(--foreground)] hover:text-[var(--primary)] hover:underline transition-colors"
                    >
                      {data.espace.name}
                    </a>
                  ) : (
                    <p className="text-lg font-bold text-[var(--foreground)]">{data.espace.name}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {data.espace.address && (
                  <Row icon={<MapPin className="w-4 h-4 text-[var(--muted)]" />}>
                    <span className="text-sm text-[var(--foreground)]">{data.espace.address}</span>
                  </Row>
                )}
                {data.espace.phone && (
                  <Row icon={<Phone className="w-4 h-4 text-[var(--muted)]" />}>
                    <a href={`tel:${data.espace.phone}`} className="text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">{data.espace.phone}</a>
                  </Row>
                )}
                {data.espace.email && (
                  <Row icon={<Mail className="w-4 h-4 text-[var(--muted)]" />}>
                    <a href={`mailto:${data.espace.email}`} className="text-sm text-[var(--primary)] hover:underline">{data.espace.email}</a>
                  </Row>
                )}
                {data.espace.website && (
                  <Row icon={<Globe className="w-4 h-4 text-[var(--muted)]" />}>
                    <a href={data.espace.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--primary)] hover:underline truncate">
                      {data.espace.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </Row>
                )}
              </div>
            </div>
          </div>

          {/* Contacts */}
          {data.contacts.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4">Nos contacts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.contacts.map((c, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[var(--border)] p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-[var(--primary)]">{c.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--foreground)] truncate">{c.name}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline truncate">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          {c.email}
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          {c.phone}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      {children}
    </div>
  )
}
