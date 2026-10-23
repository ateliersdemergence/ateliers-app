import Link from 'next/link'
import SetPasswordForm from './SetPasswordForm'

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/favicon.ico" alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-semibold text-lg">Les Ateliers d&apos;Émergence</span>
          </Link>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Bienvenue !</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Choisissez votre mot de passe pour activer votre compte</p>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm p-6">
          <SetPasswordForm />
        </div>
      </div>
    </div>
  )
}
