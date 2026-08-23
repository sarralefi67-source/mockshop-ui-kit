import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreLayout } from "@/components/store/StoreLayout";

const pages: Record<string, { title: string; intro: string; sections: { heading: string; body: string }[] }> = {
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

  return (
    <StoreLayout>
      <div className="container-page max-w-3xl py-12">
        <h1 className="page-title text-3xl">{page.title}</h1>
        <p className="mt-3 text-muted-foreground">{page.intro}</p>
        <div className="mt-8 space-y-7">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-bold">{s.heading}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </StoreLayout>
  );
}
