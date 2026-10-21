import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CONTACT, normalizeContact } from '@/lib/contact'
import ContactContent from './ContactContent'

export default async function ContactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: setting }, { data: profile }] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'contact').maybeSingle(),
    user
      ? supabase.from('users').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const contact = setting?.value ? normalizeContact(setting.value) : DEFAULT_CONTACT
  const isAdmin = profile?.role === 'admin'

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <ContactContent contact={contact} isAdmin={isAdmin} />
      </main>
    </>
  )
}
