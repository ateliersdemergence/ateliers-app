export interface ContactPerson {
  name: string
  email: string | null
  phone: string | null
}

export interface ContactInfo {
  espace: {
    name: string
    address: string
    phone: string
    email: string
    website: string
  }
  contacts: ContactPerson[]
}

// Valeurs utilisées si la base ne contient encore rien
export const DEFAULT_CONTACT: ContactInfo = {
  espace: {
    name: 'Émergence Labussière',
    address: '96 avenue Emile Labussière, 87100 Limoges',
    phone: '+33 7 82 76 93 41',
    email: 'emergence.labussiere@gmail.com',
    website: 'https://www.emergence-labussiere.fr/fr/',
  },
  contacts: [
    { name: 'Pascal Charbonnier', email: 'form4business87@gmail.com', phone: '+33 6 50 27 04 40' },
    { name: 'Jessica Mataele', email: 'contact@stratgestion.com', phone: '+33 6 42 01 19 06' },
  ],
}

export function normalizeContact(raw: unknown): ContactInfo {
  const v = (raw ?? {}) as Partial<ContactInfo>
  return {
    espace: { ...DEFAULT_CONTACT.espace, ...(v.espace ?? {}) },
    contacts: Array.isArray(v.contacts)
      ? v.contacts.map(c => ({ name: c?.name ?? '', email: c?.email || null, phone: c?.phone || null }))
      : DEFAULT_CONTACT.contacts,
  }
}
