export type Role = 'admin' | 'animateur' | 'participant' | 'collaborateur'
export type Theme = 'travail' | 'detente'
export type ReservationStatus = 'confirmed' | 'cancelled' | 'waitlist'
export type AtelierStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  email: string
  full_name: string
  role: Role
  is_active: boolean
  is_super_admin?: boolean
  phone?: string | null
  organisme?: string | null
  created_at: string
}

export interface Atelier {
  id: string
  title: string
  description: string | null
  animateur_id: string
  date: string
  start_time: string
  end_time: string
  max_participants: number
  theme: Theme
  location: string | null
  is_cancelled: boolean
  price?: number
  status?: AtelierStatus
  rejection_reason?: string | null
  created_at: string
  animateur?: User
  reservations?: Reservation[]
  spots_taken?: number
}

export interface Reservation {
  id: string
  user_id: string
  atelier_id: string
  status: ReservationStatus
  payment_id?: string | null
  payment_method?: string | null
  created_at: string
  user?: User
  atelier?: Atelier
}

export interface EmailLog {
  id: string
  sent_by: string
  atelier_id: string | null
  subject: string
  recipients_count: number
  sent_at: string
}
