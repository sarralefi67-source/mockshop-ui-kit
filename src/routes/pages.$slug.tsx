import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreLayout } from "@/components/store/StoreLayout";
import { useSiteSettings } from "@/context/SiteSettingsContext";

type PageSection = {
  heading: string;
  body?: string;
  /** Liste à puces affichée sous le paragraphe. */
  items?: string[];
  /** Paragraphe de précision affiché après la liste. */
  note?: string;
};

/**
 * Dans `body`, le jeton `{email}` est remplacé par l'adresse de contact de la
 * boutique (/admin/parametres), pour qu'une page légale ne fige pas un e-mail
 * qui peut changer.
 */
const pages: Record<string, { title: string; intro: string; sections: PageSection[] }> = {
  cgv: {
    title: "Conditions générales de vente",
    intro: "Les présentes conditions régissent les ventes réalisées sur le site (contenu de démonstration).",
    sections: [
      { heading: "1. Commandes", body: "Toute commande passée sur le site vaut acceptation des présentes conditions. Une confirmation est envoyée par SMS après validation par notre équipe." },
      { heading: "2. Prix et paiement", body: "Les prix sont indiqués en dinars tunisiens, toutes taxes comprises. Le seul mode de règlement accepté est le paiement à la livraison (espèces à la réception)." },
      { heading: "3. Livraison", body: "Livraison sous 24 à 48 heures ouvrées dans les 24 gouvernorats. Les frais de livraison s'élèvent à 7 DT." },
      { heading: "4. Retours", body: "Vous disposez de 7 jours après réception pour retourner un produit non utilisé dans son emballage d'origine." },
    ],
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    intro: "Règles d'utilisation du site et des comptes clients (contenu de démonstration).",
    sections: [
      { heading: "Compte client", body: "Vous êtes responsable de la confidentialité de vos identifiants et des activités réalisées depuis votre compte." },
      { heading: "Contenus", body: "Les visuels, textes et marques présents sur le site sont protégés et ne peuvent être reproduits sans autorisation." },
      { heading: "Avis clients", body: "Les avis publiés doivent rester courtois et se rapporter au produit concerné. Tout contenu abusif peut être retiré." },
    ],
  },
  "mentions-legales": {
    title: "Mentions légales",
    intro: "Informations relatives à l'éditeur du site (contenu de démonstration).",
    sections: [
      { heading: "Éditeur", body: "Artisanat SARL — Avenue Habib Bourguiba, Tunis, Tunisie. Matricule fiscal : 0000000/X/X/000." },
      { heading: "Contact", body: "contact@Artisanat.tn — +216 71 000 000" },
      { heading: "Hébergement", body: "Site hébergé sur une infrastructure cloud européenne." },
    ],
  },
  livraison: {
    title: "Livraison & retours",
    intro: "Tout ce qu'il faut savoir sur l'acheminement de votre commande.",
    sections: [
      { heading: "Délais", body: "24 à 48 heures ouvrées dans le Grand Tunis, 48 à 72 heures dans les autres gouvernorats." },
      { heading: "Frais", body: "7 DT quel que soit le nombre d'articles. Offerts dès 500 DT d'achat." },
      { heading: "Suivi", body: "Un SMS vous informe du départ du colis et le livreur vous appelle avant son passage." },
    ],
  },
};

pages["confidentialite"] = {
  title: "Politique de confidentialité",
  intro:
    "Dernière mise à jour : 24 août 2026. La protection de vos données personnelles est une priorité pour Artisanat. Nous nous engageons à traiter vos informations avec la plus grande confidentialité et transparence.",
  sections: [
    {
      heading: "Données collectées",
      body: "Lors de votre navigation et de vos achats sur notre site, nous sommes amenés à collecter les informations suivantes :",
      items: [
        "Nom, prénom et coordonnées (e-mail, téléphone, adresse de livraison)",
        "Historique de commandes et préférences produits",
        
      ],
    },
    {
      heading: "Utilisation des données",
      body: "Vos données sont utilisées exclusivement pour :",
      items: [
        "Traiter et suivre vos commandes",
        "Vous envoyer des informations relatives à votre compte",
        "Améliorer votre expérience sur notre site",
        "Vous adresser des offres personnalisées, avec votre accord préalable",
      ],
    },
    {
      heading: "Partage des données",
      body: "Nous ne vendons ni ne partageons vos données personnelles avec des tiers à des fins commerciales.",
    },
    {
      heading: "Cookies",
      body: "Notre site utilise des cookies pour améliorer la navigation et analyser notre audience. Vous pouvez les désactiver via les paramètres de votre navigateur ; certaines fonctionnalités pourraient alors être limitées.",
    },
    {
      heading: "Vos droits",
      body: "Conformément à la législation en vigueur, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits, contactez-nous à : {email}",
    },
  ],
};

pages["remboursement"] = {
  title: "Politique de remboursement",
  intro:
    "Dernière mise à jour : 24 août 2026. Votre satisfaction est notre priorité. Nous acceptons les retours sous certaines conditions afin de vous garantir une expérience d'achat en toute confiance.",
  sections: [
    {
      heading: "Conditions de retour",
      body: "Un retour peut être effectué dans un délai de 14 jours suivant la réception de votre commande, sous réserve du respect des conditions suivantes :",
      items: [
        "Le produit doit être non ouvert et dans son emballage d'origine intact",
        "Le produit ne doit présenter aucun signe de détérioration ou d'endommagement",
        "Le bon de commande ou la preuve d'achat doit être joint au retour",
      ],
      note: "Pour des raisons d'hygiène, les produits de soin et les parfums ouverts ou utilisés ne peuvent pas être repris ni remboursés, conformément à la réglementation en vigueur.",
    },
    {
      heading: "Frais de retour",
      body: "Les frais de retour sont à la charge du client, sauf en cas d'erreur de notre part (produit incorrect ou défectueux). Dans ce cas, Artisanat prend en charge l'intégralité des frais de renvoi.",
    },
  ],
};

export const Route = createFileRoute("/pages/$slug")({
  loader: ({ params }) => {
    const page = pages[params.slug];
    if (!page) throw notFound();
    return { title: page.title, intro: page.intro };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Page introuvable : Artisanat" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.title} : Artisanat`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.intro },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.intro },
      ],
    };
  },
  component: StaticPage,
});

function StaticPage() {
  const { slug } = Route.useParams();
  const page = pages[slug]!;
  const { settings } = useSiteSettings();
  const contactEmail = settings?.email?.trim() || "contact@artisanat.tn";

  return (
    <StoreLayout>
      <div className="container-page max-w-3xl py-12">
        <h1 className="page-title text-3xl">{page.title}</h1>
        <p className="mt-3 text-muted-foreground">{page.intro}</p>
        <div className="mt-8 space-y-7">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-bold">{s.heading}</h2>
              {s.body && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body.replace("{email}", contactEmail)}
                </p>
              )}
              {s.items && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {s.note && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {s.note.replace("{email}", contactEmail)}
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </StoreLayout>
  );
}
