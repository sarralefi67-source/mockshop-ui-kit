import { useEffect } from "react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

/**
 * Applique l'icône du site définie dans /admin/parametres.
 *
 * Le `<link rel="icon">` de __root.tsx est statique et rendu côté serveur : il
 * ne peut pas connaître une valeur qui vit en base. On le remplace donc côté
 * client dès que les paramètres sont chargés. Tant qu'aucune icône n'est
 * enregistrée, /favicon.ico reste affiché — pas d'onglet sans icône pendant le
 * chargement.
 */
export function SiteFavicon() {
  const { settings } = useSiteSettings();
  const href = settings?.favicon_url?.trim();

  useEffect(() => {
    if (!href) return;

    // On remplace le lien plutôt que d'en modifier l'href : plusieurs
    // navigateurs ignorent une mutation sur une icône déjà appliquée.
    const previous = Array.from(document.head.querySelectorAll("link[rel~='icon']"));
    previous.forEach((el) => el.remove());

    const link = document.createElement("link");
    link.rel = "icon";
    // Pas de `type` : l'icône peut être un .png, un .svg ou un .ico, on laisse
    // le navigateur déterminer le format.
    link.href = href;
    document.head.appendChild(link);

    return () => {
      link.remove();
      previous.forEach((el) => document.head.appendChild(el));
    };
  }, [href]);

  return null;
}
