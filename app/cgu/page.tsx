import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: "Conditions Générales d'Utilisation — Les Ateliers d'Émergence",
}

export default function CGUPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Conditions Générales d'Utilisation</h1>
          <p className="text-sm text-[var(--muted)]">Applicables à tout utilisateur titulaire d'un compte sur le site Les Ateliers d'Émergence</p>
        </div>

        <Section title="Article 1 — Objet">
          Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et conditions
          dans lesquelles la SARL PASCAL CHARBONNIER met à disposition du service en ligne Les Ateliers d'Émergence,
          accessible à l'adresse du site, ainsi que les droits et obligations des utilisateurs titulaires d'un compte.
          Tout accès au service implique l'acceptation pleine et entière des présentes CGU.
        </Section>

        <Section title="Article 2 — Définitions">
          <div className="flex flex-col gap-2">
            <Def term="Éditeur" def="La SARL PASCAL CHARBONNIER, responsable du site Les Ateliers d'Émergence." />
            <Def term="Service" def="La plateforme de réservation d'ateliers professionnels et ludiques accessible via le site." />
            <Def term="Utilisateur" def="Toute personne physique disposant d'un compte créé sur le site (collaborateur, animateur ou administrateur)." />
            <Def term="Compte" def="Espace personnel créé lors de l'inscription, donnant accès aux fonctionnalités du service selon le rôle attribué." />
            <Def term="Atelier" def="Session de formation ou de bien-être organisée par l'Éditeur ou un animateur partenaire, réservable via la plateforme." />
          </div>
        </Section>

        <Section title="Article 3 — Accès au service et création de compte">
          <p>
            L'accès aux fonctionnalités du service (réservation d'ateliers, consultation du planning détaillé, accès
            aux bons plans) est réservé aux utilisateurs titulaires d'un compte. La création d'un compte est gratuite
            et ouverte à toute personne physique majeure ou représentant légal d'une personne morale.
          </p>
          <p className="mt-3">
            Lors de l'inscription, l'utilisateur s'engage à fournir des informations exactes, complètes et à jour.
            Un email de confirmation est envoyé à l'adresse indiquée afin de valider le compte. L'utilisateur est
            responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte.
          </p>
          <p className="mt-3">
            L'Éditeur se réserve le droit de refuser, suspendre ou supprimer tout compte en cas de non-respect des
            présentes CGU, de fourniture d'informations erronées ou de comportement contraire à l'ordre public.
          </p>
        </Section>

        <Section title="Article 4 — Rôles et fonctionnalités">
          <p>Trois rôles sont disponibles sur la plateforme, chacun offrant des accès spécifiques :</p>
          <div className="mt-3 flex flex-col gap-3">
            <RoleBlock
              role="Collaborateur / Participant"
              features={[
                'Consultation du planning des ateliers',
                'Réservation et paiement en ligne',
                'Accès aux bons plans et actualités',
                'Gestion de son profil et de ses réservations',
              ]}
            />
            <RoleBlock
              role="Animateur"
              features={[
                'Création et gestion d\'ateliers',
                'Accès au tableau de bord personnel',
                'Toutes les fonctionnalités collaborateur',
              ]}
            />
            <RoleBlock
              role="Administrateur"
              features={[
                'Gestion complète des utilisateurs, ateliers et entreprises',
                'Accès aux historiques de paiements et formulaires',
                'Réception des notifications en temps réel',
                'Toutes les fonctionnalités animateur et collaborateur',
              ]}
            />
          </div>
        </Section>

        <Section title="Article 5 — Réservations et paiements">
          <p>
            La réservation d'un atelier est effective après confirmation du paiement en ligne (paiement sécurisé par Stripe).
            Pendant le paiement, la place est réservée 30 minutes ; passé ce délai sans paiement, elle est libérée. Le prix affiché
            correspond au tarif adhérent en vigueur au moment de la réservation. Toute réservation validée vaut
            acceptation des{' '}
            <Link href="/cgv" className="text-[var(--primary)] hover:underline">
              Conditions Générales de Vente
            </Link>.
          </p>
          <p className="mt-3">
            L'Éditeur se réserve le droit de modifier les tarifs à tout moment. Le tarif applicable est celui affiché
            au moment de la confirmation de la commande.
          </p>
        </Section>

        <Section title="Article 6 — Obligations de l'utilisateur">
          <p>L'utilisateur s'engage à :</p>
          <ul className="list-disc list-inside mt-3 flex flex-col gap-1.5 pl-1">
            <li>Utiliser le service dans le respect des lois et règlements en vigueur</li>
            <li>Ne pas diffuser de contenu illicite, diffamatoire, offensant ou portant atteinte aux droits de tiers</li>
            <li>Ne pas tenter d'accéder à des parties du service pour lesquelles il n'est pas autorisé</li>
            <li>Ne pas perturber le bon fonctionnement du service</li>
            <li>Maintenir la confidentialité de ses identifiants de connexion</li>
            <li>Informer l'Éditeur de toute utilisation non autorisée de son compte</li>
          </ul>
        </Section>

        <Section title="Article 7 — Données personnelles">
          <p>
            Dans le cadre de la création et de l'utilisation du compte, l'Éditeur collecte et traite les données
            personnelles suivantes : nom, prénom, adresse email, numéro de téléphone, et le cas échéant le nom
            de l'entreprise de rattachement.
          </p>
          <p className="mt-3">
            Ces données sont traitées conformément au RGPD (Règlement UE 2016/679) aux fins de gestion du compte,
            de traitement des réservations et de communication relative au service. Elles ne sont pas cédées à des
            tiers à des fins commerciales.
          </p>
          <p className="mt-3">
            L'utilisateur dispose d'un droit d'accès, de rectification, d'effacement et d'opposition, exerceable
            à{' '}
            <a href="mailto:form4business@gmail.com" className="text-[var(--primary)] hover:underline">
              form4business@gmail.com
            </a>
            {' '}ou par courrier à : 96 avenue Emile Labussière, 87100 Limoges. Pour plus de détails, consultez
            nos{' '}
            <Link href="/mentions-legales" className="text-[var(--primary)] hover:underline">
              Mentions légales
            </Link>.
          </p>
        </Section>

        <Section title="Article 8 — Suspension et suppression du compte">
          <p>
            L'utilisateur peut demander la suppression de son compte à tout moment en contactant l'Éditeur à{' '}
            <a href="mailto:form4business@gmail.com" className="text-[var(--primary)] hover:underline">
              form4business@gmail.com
            </a>. La suppression entraîne la perte définitive de l'accès au service et des données associées,
            sous réserve des obligations légales de conservation.
          </p>
          <p className="mt-3">
            L'Éditeur se réserve le droit de suspendre ou de supprimer un compte sans préavis en cas de violation
            des présentes CGU, d'utilisation frauduleuse du service ou de comportement préjudiciable à d'autres utilisateurs.
          </p>
        </Section>

        <Section title="Article 9 — Responsabilité de l'Éditeur">
          <p>
            L'Éditeur s'engage à mettre tout en œuvre pour assurer la disponibilité et la continuité du service.
            Toutefois, il ne peut être tenu responsable des interruptions liées à des opérations de maintenance,
            à des défaillances techniques ou à des cas de force majeure.
          </p>
          <p className="mt-3">
            L'Éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation
            ou de l'impossibilité d'utiliser le service.
          </p>
        </Section>

        <Section title="Article 10 — Modification des CGU">
          L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés
          de toute modification substantielle. La poursuite de l'utilisation du service après notification vaut
          acceptation des nouvelles CGU. Les CGU en vigueur sont celles accessibles sur le site à la date de
          connexion de l'utilisateur.
        </Section>

        <Section title="Article 11 — Droit applicable et litiges">
          Les présentes CGU sont soumises au droit français. En cas de litige relatif à leur interprétation ou
          à leur exécution, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.
          À défaut, les tribunaux français seront seuls compétents.
        </Section>

        <div className="text-center pt-4 pb-8">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors underline underline-offset-2">
            ← Retour à l'accueil
          </Link>
        </div>
      </main>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[var(--border)] p-6 mb-6">
      <h2 className="text-base font-semibold text-[var(--foreground)] mb-3">{title}</h2>
      <div className="text-sm text-[var(--muted)] leading-relaxed">{children}</div>
    </section>
  )
}

function Def({ term, def }: { term: string; def: string }) {
  return (
    <div className="flex gap-2 text-sm py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="font-medium text-[var(--foreground)] shrink-0 w-36">{term}</span>
      <span>{def}</span>
    </div>
  )
}

function RoleBlock({ role, features }: { role: string; features: string[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="font-medium text-[var(--foreground)] mb-2">{role}</p>
      <ul className="list-disc list-inside flex flex-col gap-1 pl-1">
        {features.map(f => <li key={f}>{f}</li>)}
      </ul>
    </div>
  )
}
