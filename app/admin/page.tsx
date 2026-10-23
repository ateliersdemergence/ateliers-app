import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import Navbar from '@/components/layout/Navbar'
import DashboardCharts from './DashboardCharts'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const [
    { count: totalParticipants },
    { count: totalAnimateurs },
    { count: totalAteliers },
    { count: totalReservations },
    { data: participants },
    { data: confirmedReservations },
    { data: atelierData },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'participant'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'animateur'),
    supabase.from('ateliers').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('users').select('id, organisme, created_at').eq('role', 'participant').order('created_at', { ascending: true }),
    supabase.from('reservations').select('users(organisme)').eq('status', 'confirmed'),
    supabase.from('ateliers_with_spots').select('title, theme, date, spots_taken, max_participants').or('is_cancelled.eq.false,is_cancelled.is.null').eq('status', 'approved').order('date', { ascending: false }).limit(12),
  ])

  // Auth users pour les connexions (last_sign_in_at)
  let authUsers: { last_sign_in_at?: string | null }[] = []
  try {
    const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    authUsers = data?.users ?? []
  } catch { /* service role non configuré */ }

  // Fenêtre 30 jours
  const today = new Date()
  const dateRange: string[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })
  const rangeStart = dateRange[0]

  // Connexions par jour (last_sign_in_at)
  const connexionsByDay: Record<string, number> = {}
  authUsers.forEach(u => {
    if (!u.last_sign_in_at) return
    const date = u.last_sign_in_at.split('T')[0]
    if (date >= rangeStart) connexionsByDay[date] = (connexionsByDay[date] ?? 0) + 1
  })

  // Inscriptions par jour (created_at)
  const inscriptionsByDay: Record<string, number> = {}
  participants?.forEach(p => {
    const date = p.created_at.split('T')[0]
    if (date >= rangeStart) inscriptionsByDay[date] = (inscriptionsByDay[date] ?? 0) + 1
  })

  const activityByDay = dateRange.map(date => ({
    date: format(parseISO(date), 'd MMM', { locale: fr }),
    connexions: connexionsByDay[date] ?? 0,
    inscriptions: inscriptionsByDay[date] ?? 0,
  }))

  // Participants par organisme
  const orgCount: Record<string, number> = {}
  participants?.forEach(p => {
    const org = p.organisme?.trim() || 'Non renseigné'
    orgCount[org] = (orgCount[org] ?? 0) + 1
  })
  const usersByOrganisme = Object.entries(orgCount)
    .map(([organisme, count]) => ({ organisme: organisme.length > 22 ? organisme.slice(0, 20) + '…' : organisme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Taux participation par organisme
  const orgReservations: Record<string, number> = {}
  confirmedReservations?.forEach(r => {
    const org = (r.users as { organisme?: string | null } | null)?.organisme?.trim() || 'Non renseigné'
    orgReservations[org] = (orgReservations[org] ?? 0) + 1
  })
  const participationByOrganisme = Object.entries(orgReservations)
    .map(([organisme, reservations]) => ({
      organisme: organisme.length > 22 ? organisme.slice(0, 20) + '…' : organisme,
      taux: orgCount[organisme] ? Math.round((reservations / orgCount[organisme]) * 100) : 0,
    }))
    .sort((a, b) => b.taux - a.taux)
    .slice(0, 8)

  // Taux de remplissage par atelier
  const atelierFillRates = (atelierData ?? []).map(a => ({
    title: a.title.length > 28 ? a.title.slice(0, 26) + '…' : a.title,
    fillRate: Math.round(((a.spots_taken ?? 0) / Math.max(a.max_participants, 1)) * 100),
    spotsTaken: a.spots_taken ?? 0,
    max: a.max_participants,
    theme: a.theme,
  })).sort((a, b) => b.fillRate - a.fillRate)

  // Distribution thèmes
  const themeCount = { travail: 0, detente: 0 }
  atelierData?.forEach(a => { a.theme === 'travail' ? themeCount.travail++ : themeCount.detente++ })
  const themeDistribution = [
    { name: 'Professionnel', value: themeCount.travail, color: '#3b82f6' },
    { name: 'Ludique', value: themeCount.detente, color: '#10b981' },
  ]

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Tableau de bord</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Vue d'ensemble et statistiques de la plateforme</p>
        </div>

        <DashboardCharts
          stats={{
            totalParticipants: totalParticipants ?? 0,
            totalAnimateurs: totalAnimateurs ?? 0,
            totalAteliers: totalAteliers ?? 0,
            totalReservations: totalReservations ?? 0,
          }}
          activityByDay={activityByDay}
          usersByOrganisme={usersByOrganisme}
          participationByOrganisme={participationByOrganisme}
          atelierFillRates={atelierFillRates}
          themeDistribution={themeDistribution}
        />
      </main>
    </>
  )
}
