import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: "Conditions Générales de Vente — Les Ateliers d'Émergence",
}

export default function CGVPage() {
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
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Conditions Générales de Vente</h1>
          <p className="text-sm text-[var(--muted)]">SARL PASCAL CHARBONNIER</p>
        </div>

        {/* Parties */}
        <section className="bg-white rounded-2xl border border-[var(--border)] p-6 mb-6">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">Parties au contrat</h2>
          <div className="flex flex-col gap-5 text-sm text-[var(--muted)] leading-relaxed">
            <div>
              <p className="font-medium text-[var(--foreground)] mb-1">Le Vendeur</p>
              <p>
                Société <strong className="text-[var(--foreground)]">SARL PASCAL CHARBONNIER</strong>, 96 AVENUE EMILE LABUSSIERE 87100 LIMOGES,
                au Capital Social de 1 000 EUR, immatriculée au Registre du Commerce et des Sociétés de LIMOGES,
                sous le numéro SIRET <strong className="text-[var(--foreground)]">98358479800018</strong>,
                représentée par M. Pascal CHARBONNIER en qualité de gérant, dûment habilité aux fins des présentes.
              </p>
              <p className="mt-2">
                La société peut être jointe par email en cliquant sur le formulaire de contact accessible via la page d'accueil du site.
              </p>
              <div className="mt-3 flex flex-col gap-1 text-xs">
                <span>Téléphone : <a href="tel:0650270440" className="text-[var(--primary)] hover:underline">06.50.27.04.40</a></span>
                <span>Mail : <a href="mailto:form4business@gmail.com" className="text-[var(--primary)] hover:underline">form4business@gmail.com</a></span>
                <span>Adresse : 96 AVENUE EMILE LABUSSIERE 87100 LIMOGES</span>
              </div>
            </div>
            <div className="border-t border-[var(--border)] pt-5">
              <p className="font-medium text-[var(--foreground)] mb-1">L'Acheteur</p>
              <p>La personne physique ou morale procédant à l'achat de produits ou services de la société.</p>
            </div>
          </div>
        </section>

        {/* Préambule */}
        <Section title="Préambule">
          Le Vendeur est éditeur de Produits et Services de formation en présentiel, en e-learning ou en blended learning
          et de livre de poche à destination de consommateurs, commercialisés par l'intermédiaire de ses sites Internet{' '}
          <a href="https://www.form4business.fr/" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
            https://www.form4business.fr/
          </a>.{' '}
          La liste et le descriptif des biens et services proposés par la Société peuvent être consultés sur les sites susmentionnés.
        </Section>

        <Section title="Article 1 — Objet">
          Les présentes Conditions Générales de Vente déterminent les droits et obligations des parties dans le cadre de la
          vente en ligne de Produits ou Services proposés par le Vendeur.
        </Section>

        <Section title="Article 2 — Dispositions générales">
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent les ventes de Produits ou de Services, effectuées
            au travers des sites Internet de la Société, et sont partie intégrante du Contrat entre l'Acheteur et le Vendeur.
            Elles sont pleinement opposables à l'Acheteur qui les a acceptées avant de passer commande.
          </p>
          <p className="mt-3">
            Le Vendeur se réserve la possibilité de modifier les présentes, à tout moment par la publication d'une nouvelle
            version sur son site Internet. Les CGV applicables sont celles en vigueur à la date du paiement de la commande.
          </p>
          <p className="mt-3">
            La Société s'assure que leur acceptation soit claire et sans réserve en mettant en place une case à cocher et
            un clic de validation. Le Client déclare avoir pris connaissance de l'ensemble des présentes CGV et les accepter
            sans restriction ni réserve.
          </p>
          <p className="mt-3">
            Le Client reconnaît qu'il a bénéficié des conseils et informations nécessaires afin de s'assurer de l'adéquation
            de l'offre à ses besoins. Il déclare être en mesure de contracter légalement en vertu des lois françaises.
          </p>
          <p className="mt-3">
            Sauf preuve contraire, les informations enregistrées par la Société constituent la preuve de l'ensemble des transactions.
          </p>
        </Section>

        <Section title="Article 3 — Prix">
          <p>
            Les prix des produits vendus au travers des sites Internet sont indiqués en Euros hors taxes sur les pages de
            descriptifs des Produits, et en euros toutes taxes comprises (TVA + autres taxes éventuelles) sur la page de commande.
          </p>
          <p className="mt-3">
            Pour tous les produits expédiés hors Union européenne et/ou DOM-TOM, le prix est calculé hors taxes automatiquement
            sur la facture. Des droits de douane ou taxes locales peuvent être exigibles — ils restent à la charge de l'acheteur.
          </p>
          <p className="mt-3">
            La Société se réserve la possibilité de modifier ses prix à tout moment pour l'avenir. Les frais de
            télécommunication nécessaires à l'accès aux sites Internet sont à la charge du Client.
          </p>
        </Section>

        <Section title="Article 4 — Conclusion du contrat en ligne">
          <p>Conformément à l'article 1127-1 du Code civil, le Client doit suivre les étapes suivantes :</p>
          <ol className="list-decimal list-inside mt-3 flex flex-col gap-1.5 pl-1">
            <li>Information sur les caractéristiques essentielles du Produit</li>
            <li>Choix du Produit et, le cas échéant, de ses options</li>
            <li>Indication des coordonnées essentielles du Client</li>
            <li>Acceptation des présentes Conditions Générales de Vente</li>
            <li>Vérification des éléments de la commande (formalité du double clic) et correction des erreurs</li>
            <li>Confirmation et suivi des instructions pour le paiement, puis livraison de la commande</li>
          </ol>
          <p className="mt-3">
            Le Client recevra confirmation par courrier électronique du paiement ainsi qu'un accusé de réception de la
            commande. Il recevra un exemplaire PDF des présentes CGV. L'archivage des communications et factures est
            effectué sur un support fiable et durable conformément à l'article 1360 du Code civil.
          </p>
        </Section>

        <Section title="Article 5 — Produits et services">
          <p>
            Les caractéristiques essentielles des biens, des services et leurs prix respectifs sont mis à disposition de
            l'acheteur sur les sites Internet de la société, conformément à l'article L112-1 du Code de la consommation.
          </p>
          <p className="mt-3">
            Le montant total dû par l'Acheteur est indiqué sur la page de confirmation de la commande. Le prix de vente
            est celui en vigueur au jour de la commande. Le Vendeur s'engage à honorer la commande dans la limite des
            stocks disponibles ; à défaut, il en informe le Client et procède au remboursement si aucun accord n'est trouvé.
          </p>
        </Section>

        <Section title="Article 6 — Conformité">
          Le Vendeur assume les garanties de conformité et relative aux vices cachés des produits. Il livre un bien conforme
          au contrat et répond des défauts de conformité existant lors de la délivrance, y compris ceux résultant de l'emballage
          ou des instructions de montage. Le Vendeur rembourse ou échange les produits défectueux ou ne correspondant pas à la commande.
        </Section>

        <Section title="Article 7 — Clause de réserve de propriété">
          Les produits demeurent la propriété de la Société jusqu'au complet paiement du prix.
        </Section>

        <Section title="Article 8 — Modalités de livraison">
          <p>
            Les produits sont livrés à l'adresse ou via l'adresse mail indiquée lors de la commande, dans les délais convenus.
            En cas de retard de livraison, le Client peut résoudre le contrat selon les conditions définies à l'Article L 216-2
            du Code de la consommation et obtenir remboursement selon les articles L216-3 et L241-4 dudit Code.
          </p>
          <p className="mt-3">
            Au moment où le Client prend possession physiquement des produits, les risques de perte ou d'endommagement lui
            sont transférés. Il lui appartient de notifier au transporteur toute réserve sur le produit livré.
          </p>
        </Section>

        <Section title="Article 9 — Disponibilité">
          En cas d'indisponibilité d'un article pour une période supérieure à 60 jours ouvrables, le client sera immédiatement
          prévenu. La commande pourra être annulée sur simple demande et le Client pourra obtenir un avoir ou un remboursement intégral.
        </Section>

        <Section title="Article 10 — Paiement">
          <p>
            Le paiement est exigible immédiatement à la commande. Le Client effectue le règlement par carte de
            paiement (y compris via Apple Pay ou Google Pay).
            Les cartes émises par des banques domiciliées hors de France doivent être des cartes bancaires internationales
            (Mastercard ou Visa).
          </p>
          <p className="mt-3">
            Le paiement sécurisé en ligne est réalisé par notre prestataire de paiement{' '}
            <strong className="text-[var(--foreground)]">Stripe</strong> (Stripe Payments Europe, Ltd.) sur une page
            de paiement hébergée par Stripe : les informations transmises sont chiffrées et ne peuvent être lues au cours
            du transport sur le réseau ; les données de carte ne sont ni transmises ni conservées par le Vendeur.
            Le traitement des données par Stripe est décrit dans sa{' '}
            <a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer"
              className="text-[var(--primary)] hover:underline">
              politique de confidentialité
            </a>.
          </p>
          <p className="mt-3">
            Conformément au Code monétaire et financier, l'engagement de payer donné par carte est irrévocable.
            En cas d'erreur ou d'impossibilité de débit, la vente est immédiatement résolue de plein droit et la
            commande annulée.
          </p>
        </Section>

        <Section title="Article 11 — Délai de rétractation">
          <p>
            Conformément à l'article L 221-5 du Code de la consommation, l'Acheteur dispose du droit de se rétracter sans
            donner de motif dans un délai de <strong className="text-[var(--foreground)]">14 jours</strong> à compter de la
            réception de sa commande.
          </p>
          <p className="mt-3">
            Le droit de rétractation peut être exercé par courrier mail à{' '}
            <a href="mailto:form4business@gmail.com" className="text-[var(--primary)] hover:underline">form4business@gmail.com</a>
            {' '}ou par courrier recommandé avec accusé de réception à l'adresse : 96 avenue Emile Labussière 87100 LIMOGES.
          </p>
          <p className="mt-3">
            Ce droit ne peut être exercé pour les biens non sujets à ces dispositions (cf. articles L. 221-18 à L. 221-28
            du Code de la consommation). En cas d'exercice du droit de rétractation, le prix du ou des produits achetés et
            les frais d'envoi seront remboursés, les frais de retour restant à la charge du Client.
          </p>
        </Section>

        <Section title="Article 12 — Garanties">
          <p>Le Vendeur assume les garanties de conformité et relative aux vices cachés. Le consommateur :</p>
          <ul className="list-disc list-inside mt-3 flex flex-col gap-1.5 pl-1">
            <li>Dispose d'un délai de 2 ans à compter de la délivrance pour agir</li>
            <li>Peut choisir entre le remplacement et la réparation du bien</li>
            <li>Est dispensé d'apporter la preuve du défaut durant les 24 mois suivant la délivrance</li>
            <li>Peut faire valoir la garantie contre les vices cachés (article 1641 du Code civil)</li>
          </ul>
        </Section>

        <Section title="Article 13 — Réclamations et médiation">
          <p>
            Toute réclamation peut être adressée à{' '}
            <a href="mailto:form4business@gmail.com" className="text-[var(--primary)] hover:underline">form4business@gmail.com</a>
            {' '}ou par courrier recommandé à : 96 avenue Emile Labussière 87100 LIMOGES.
          </p>
          <p className="mt-3">
            Conformément aux articles L. 611-1 à L. 616-3 du Code de la consommation, le consommateur peut recourir à un
            médiateur de la consommation en cas d'échec de la réclamation auprès du service client ou en l'absence de
            réponse dans un délai de deux mois.
          </p>
        </Section>

        <Section title="Article 14 — Résolution du contrat">
          <p>La commande peut être résolue par l'acheteur par lettre recommandée dans les cas suivants :</p>
          <ul className="list-disc list-inside mt-3 flex flex-col gap-1.5 pl-1">
            <li>Livraison d'un produit non conforme aux caractéristiques de la commande</li>
            <li>Livraison dépassant la date limite fixée ou, à défaut, 30 jours après le paiement</li>
            <li>Hausse du prix injustifiée ou modification du produit</li>
          </ul>
          <p className="mt-3">
            Dans ces cas, l'acheteur peut exiger le remboursement de l'acompte versé majoré des intérêts au taux légal
            à partir de la date d'encaissement.
          </p>
        </Section>

        <Section title="Article 15 — Droits de propriété intellectuelle">
          Les marques, noms de domaines, produits, logiciels, images, vidéos, textes ou plus généralement toute information
          objet de droits de propriété intellectuelle sont et restent la propriété exclusive du vendeur. Aucune cession de
          droits n'est réalisée au travers des présentes CGV. Toute reproduction totale ou partielle, modification ou
          utilisation de ces biens est strictement interdite.
        </Section>

        <Section title="Article 16 — Force majeure">
          L'exécution des obligations du vendeur est suspendue en cas de survenance d'un cas fortuit ou de force majeure
          qui en empêcherait l'exécution. Le vendeur avisera le client de la survenance d'un tel événement dès que possible.
        </Section>

        <Section title="Article 17 — Nullité et modification du contrat">
          Si l'une des stipulations du présent contrat était annulée, cette nullité n'entraînerait pas la nullité des
          autres stipulations qui demeureront en vigueur entre les parties. Toute modification contractuelle n'est valable
          qu'après un accord écrit et signé des parties.
        </Section>

        <Section title="Article 18 — Protection des données personnelles">
          <p>
            Conformément au RGPD (Règlement 2016/679 du 27 avril 2016), le Vendeur met en place un traitement de données
            personnelles ayant pour finalité la vente et la livraison de produits et services.
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <InfoRow label="Responsable du traitement" value="Le Vendeur, tel qu'indiqué en haut des présentes CGV" />
            <InfoRow label="Base juridique" value="L'exécution contractuelle" />
            <InfoRow label="Destinataires" value="Le responsable du traitement et ses sous-traitants intervenants dans les opérations de livraison" />
            <InfoRow label="Transferts hors UE" value="Aucun transfert hors UE n'est prévu" />
            <InfoRow label="Durée de conservation" value="Le temps de la prescription commerciale" />
            <InfoRow label="Droits des personnes" value="Droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité" />
            <InfoRow label="Réclamation" value="La personne concernée a le droit d'introduire une réclamation auprès de la CNIL" />
          </div>
          <p className="mt-3">
            Aucune décision automatisée ou profilage n'est mis en œuvre au travers du processus de commande.
          </p>
        </Section>

        <Section title="Article 19 — Droit applicable">
          Toutes les clauses figurant dans les présentes CGV, ainsi que toutes les opérations d'achat et de vente qui y
          sont visées, seront soumises au droit français. La nullité d'une clause contractuelle n'entraîne pas la nullité
          des présentes conditions générales de vente.
        </Section>

        {/* Article 20 */}
        <section className="bg-white rounded-2xl border border-[var(--border)] p-6 mb-6">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">Article 20 — Information des consommateurs</h2>
          <div className="flex flex-col gap-5 text-sm text-[var(--muted)] leading-relaxed">
            <div>
              <p className="font-medium text-[var(--foreground)] mb-1">Article 1641 du Code civil</p>
              <p>
                Le vendeur est tenu de la garantie à raison des défauts cachés de la chose vendue qui la rendent impropre
                à l'usage auquel on la destine, ou qui diminuent tellement cet usage que l'acheteur ne l'aurait pas acquise,
                ou n'en aurait donné qu'un moindre prix, s'il les avait connus.
              </p>
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <p className="font-medium text-[var(--foreground)] mb-1">Article 1648 du Code civil</p>
              <p>
                L'action résultant des vices rédhibitoires doit être intentée par l'acquéreur dans un délai de deux ans
                à compter de la découverte du vice.
              </p>
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <p className="font-medium text-[var(--foreground)] mb-1">Article L. 217-4 du Code de la consommation</p>
              <p>
                Le vendeur livre un bien conforme au contrat et répond des défauts de conformité existant lors de la délivrance.
              </p>
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <p className="font-medium text-[var(--foreground)] mb-1">Article L. 217-5 du Code de la consommation</p>
              <p>
                Le bien est conforme au contrat s'il est propre à l'usage habituellement attendu d'un bien semblable et,
                le cas échéant, s'il correspond à la description donnée par le vendeur et possède les qualités que celui-ci
                a présentées à l'acheteur sous forme d'échantillon ou de modèle.
              </p>
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <p className="font-medium text-[var(--foreground)] mb-1">Article L. 217-12 du Code de la consommation</p>
              <p>
                L'action résultant du défaut de conformité se prescrit par deux ans à compter de la délivrance du bien.
              </p>
            </div>
          </div>
        </section>

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-medium text-[var(--foreground)] shrink-0 min-w-[180px]">{label} :</span>
      <span className="text-[var(--muted)]">{value}</span>
    </div>
  )
}
