'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, User, LogOut, LayoutDashboard, Users, CreditCard, Building2, CalendarPlus, CalendarCheck, Menu, X, FileText } from 'lucide-react'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const adminRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoaded(true); return }
      const { data: profile } = await supabase
        .from('users')
        .select('role, is_super_admin')
        .eq('id', user.id)
        .single()
      setRole(profile?.role ?? null)
      setIsSuperAdmin(profile?.is_super_admin ?? false)
      setLoaded(true)
    }
    fetchRole()
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) setAdminOpen(false)
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Ferme le menu mobile au changement de page
  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const actualitesLink = { href: '/actualites', label: 'Actualités' }
  const bonPlansLink = { href: '/bon-plans', label: 'Bons Plans' }
  const proutLink = { href: '/prout', label: 'Nous Rejoindre' }
  const contactLink = { href: '/contact', label: 'Contact' }

  const links = role === 'admin'
    ? [
        { href: '/planning', label: 'Planning' },
        { href: '/entreprises', label: 'Entreprises' },
        actualitesLink,
        bonPlansLink,
        proutLink,
        contactLink,
      ]
    : role === 'animateur'
    ? [
        { href: '/dashboard', label: 'Tableau de bord' },
        { href: '/ateliers/nouveau', label: 'Créer un atelier' },
        { href: '/planning', label: 'Planning' },
        { href: '/entreprises', label: 'Entreprises' },
        actualitesLink,
        bonPlansLink,
        proutLink,
        contactLink,
      ]
    : role === 'collaborateur'
    ? [
        { href: '/planning', label: 'Planning' },
        { href: '/entreprises', label: 'Entreprises' },
        actualitesLink,
        bonPlansLink,
        proutLink,
        contactLink,
      ]
    : role === 'participant'
    ? [
        { href: '/planning', label: 'Planning' },
        { href: '/entreprises', label: 'Entreprises' },
        actualitesLink,
        proutLink,
        contactLink,
      ]
    : [
        { href: '/planning', label: 'Planning' },
        { href: '/entreprises', label: 'Entreprises' },
        actualitesLink,
        proutLink,
        contactLink,
      ]

  const isAdminSection = pathname.startsWith('/admin')

  const adminLinks = [
    { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/dashboard', label: 'Mes ateliers', icon: LayoutDashboard },
    { href: '/ateliers/nouveau', label: 'Créer un atelier', icon: CalendarPlus },
    { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
    { href: '/admin/entreprises', label: 'Entreprises', icon: Building2 },
    { href: '/admin/paiements', label: 'Historique des paiements', icon: CreditCard },
    // Validation des ateliers et candidatures : réservées au super admin
    ...(isSuperAdmin ? [
      { href: '/admin/validation', label: 'Ateliers à valider', icon: CalendarCheck },
      { href: '/admin/formulaires', label: 'Formulaires', icon: FileText },
    ] : []),
  ]

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/favicon.ico" alt="Logo" className="w-8 h-8 rounded-xl object-cover" />
            <span className="font-semibold text-[var(--foreground)]">Les Ateliers d'Émergence</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {loaded && role === 'admin' && (
              <div className="relative" ref={adminRef}>
                <button
                  onClick={() => { setAdminOpen(o => !o); setAccountOpen(false) }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isAdminSection
                      ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]'
                  )}
                >
                  Administration
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', adminOpen && 'rotate-180')} />
                </button>
                {adminOpen && (
                  <div className="animate-slide-up absolute left-0 top-full mt-2 w-56 bg-white rounded-xl border border-[var(--border)] shadow-lg overflow-hidden z-50">
                    {adminLinks.map(({ href, label, icon: Icon }, i) => (
                      <div key={href}>
                        {i > 0 && <div className="border-t border-[var(--border)]" />}
                        <Link
                          href={href}
                          onClick={() => setAdminOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                            pathname === href
                              ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                              : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 text-[var(--muted)]" />
                          {label}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {loaded && links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]'
                )}
              >
                {label}
              </Link>
            ))}

            {/* Cloche notifications — admin uniquement */}
            {loaded && role === 'admin' && <NotificationBell />}

            {loaded && role && (
              <div className="relative ml-2" ref={accountRef}>
                <button
                  onClick={() => { setAccountOpen(o => !o); setAdminOpen(false) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  Mon compte
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', accountOpen && 'rotate-180')} />
                </button>
                {accountOpen && (
                  <div className="animate-slide-up absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-[var(--border)] shadow-lg overflow-hidden z-50">
                    <Link href="/mon-compte" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)] transition-colors">
                      <User className="w-3.5 h-3.5 text-[var(--muted)]" />
                      Profil
                    </Link>
                    <div className="border-t border-[var(--border)]" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            )}

            {loaded && !role && (
              <Link href="/connexion" className="ml-2 px-4 py-1.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                Connexion
              </Link>
            )}
          </nav>

          {/* Hamburger mobile */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="lg:hidden p-2 rounded-xl hover:bg-[var(--border)] text-[var(--foreground)] transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-40 bg-white overflow-y-auto">
          <div className="flex flex-col px-4 py-4 gap-1">

            {/* Admin section */}
            {loaded && role === 'admin' && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider px-3 py-2">Administration</p>
                {adminLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                      pathname === href
                        ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                    )}
                  >
                    <Icon className="w-4 h-4 text-[var(--muted)]" />
                    {label}
                  </Link>
                ))}
                <div className="border-t border-[var(--border)] my-2" />
              </div>
            )}

            {/* Regular links */}
            {loaded && links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                )}
              >
                {label}
              </Link>
            ))}

            {/* Mon compte */}
            {loaded && role && (
              <>
                <div className="border-t border-[var(--border)] my-2" />
                <Link href="/mon-compte" className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] transition-colors">
                  <User className="w-4 h-4 text-[var(--muted)]" />
                  Mon profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
              </>
            )}

            {/* Connexion */}
            {loaded && !role && (
              <>
                <div className="border-t border-[var(--border)] my-2" />
                <Link
                  href="/connexion"
                  className="w-full text-center py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Connexion
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
