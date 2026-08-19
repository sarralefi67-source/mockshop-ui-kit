import type { Product, ProductAttribute, ProductImage, ProductVariant } from "@/types";

interface Seed {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category_id: string;
  short: string;
  desc: string;
  price: number;
  compare?: number;
  stock: number;
  is_new?: boolean;
  rating: number;
  reviews_count: number;
  created_at: string;
  tags: string[];
  colors?: { id: string; label: string; hex: string }[];
  sizes?: { id: string; label: string }[];
}

const seeds: Seed[] = [
  {
    id: "p-1", name: "PC Portable Vertex 15 — i7 / 16 Go / 512 Go", slug: "pc-portable-vertex-15",
    brand: "Vertex", category_id: "c-info-pc-portable",
    short: "Ultrabook 15,6\" Full HD, Intel Core i7 12e gén., 16 Go RAM, SSD 512 Go.",
    desc: "Le Vertex 15 combine puissance et autonomie dans un châssis aluminium de 1,6 kg. Écran 15,6\" IPS antireflet, clavier rétroéclairé, double ventilation et batterie 65 Wh pour tenir la journée. Idéal bureautique avancée, développement et création.",
    price: 2499, compare: 2899, stock: 12, rating: 4.6, reviews_count: 34, created_at: "2026-05-04",
    tags: ["pc", "portable", "i7"],
    colors: [
      { id: "col-gris", label: "Gris sidéral", hex: "#8a8f98" },
      { id: "col-noir", label: "Noir mat", hex: "#2b2b2e" },
    ],
  },
  {
    id: "p-2", name: "Écran Gaming Orbit 27\" 165 Hz", slug: "ecran-gaming-orbit-27",
    brand: "Orbit", category_id: "c-info-per-ecran",
    short: "Dalle IPS QHD 27 pouces, 165 Hz, 1 ms, FreeSync Premium.",
    desc: "Un écran 27\" QHD taillé pour le jeu compétitif : 165 Hz, 1 ms MPRT, HDR400 et pied ergonomique réglable en hauteur, pivot et rotation.",
    price: 899, compare: 1050, stock: 7, rating: 4.4, reviews_count: 21, created_at: "2026-06-11",
    tags: ["ecran", "gaming"],
  },
  {
    id: "p-3", name: "Clavier mécanique Kinetic TKL", slug: "clavier-mecanique-kinetic-tkl",
    brand: "Kinetic", category_id: "c-info-per-clavier",
    short: "Clavier mécanique compact, switches rouges, rétroéclairage RGB.",
    desc: "Format TKL pour libérer de l'espace, châssis alu, switches linéaires hot-swap et repose-poignet magnétique. Câble USB-C détachable.",
    price: 219, compare: 269, stock: 40, is_new: true, rating: 4.8, reviews_count: 57, created_at: "2026-07-22",
    tags: ["clavier", "rgb"],
    colors: [
      { id: "col-blanc", label: "Blanc", hex: "#f2f2f0" },
      { id: "col-noir", label: "Noir", hex: "#232326" },
      { id: "col-bleu", label: "Bleu nuit", hex: "#2f4a7a" },
    ],
  },
  {
    id: "p-4", name: "SSD NVMe FlashOne 1 To", slug: "ssd-nvme-flashone-1to",
    brand: "FlashOne", category_id: "c-info-comp-ssd",
    short: "SSD M.2 NVMe Gen4, jusqu'à 7000 Mo/s en lecture.",
    desc: "Boostez vos temps de chargement avec un SSD Gen4 endurant (600 TBW), dissipateur graphène inclus, compatible PC et consoles.",
    price: 349, stock: 0, rating: 4.7, reviews_count: 19, created_at: "2026-03-02",
    tags: ["ssd", "stockage"],
  },
  {
    id: "p-5", name: "Smartphone Nova X5 128 Go", slug: "smartphone-nova-x5",
    brand: "Nova", category_id: "c-tel-smart",
    short: "AMOLED 6,7\" 120 Hz, triple capteur 108 MP, charge rapide 67 W.",
    desc: "Le Nova X5 mise sur l'essentiel : un grand écran AMOLED fluide, une photo polyvalente de jour comme de nuit et une charge complète en 40 minutes. Double SIM, NFC, batterie 5000 mAh.",
    price: 1299, compare: 1499, stock: 23, is_new: true, rating: 4.3, reviews_count: 88, created_at: "2026-07-30",
    tags: ["smartphone", "amoled"],
    colors: [
      { id: "col-noir", label: "Noir minuit", hex: "#1c1c22" },
      { id: "col-vert", label: "Vert sauge", hex: "#7c9a80" },
      { id: "col-or", label: "Or sable", hex: "#d9b382" },
    ],
    sizes: [
      { id: "sz-128", label: "128 Go" },
      { id: "sz-256", label: "256 Go" },
    ],
  },
  {
    id: "p-6", name: "Casque sans fil AudioPulse ANC", slug: "casque-audiopulse-anc",
    brand: "AudioPulse", category_id: "c-tel-audio-casque",
    short: "Réduction de bruit active, 40 h d'autonomie, Bluetooth 5.3.",
    desc: "Un casque circum-auriculaire confortable avec ANC hybride, mode transparence, multipoint et étui de transport rigide.",
    price: 429, compare: 549, stock: 15, rating: 4.5, reviews_count: 62, created_at: "2026-06-28",
    tags: ["casque", "anc"],
    colors: [
      { id: "col-noir", label: "Noir", hex: "#26262a" },
      { id: "col-creme", label: "Crème", hex: "#e9e1d5" },
    ],
  },
  {
    id: "p-7", name: "Coque renforcée ArmorFit", slug: "coque-renforcee-armorfit",
    brand: "ArmorFit", category_id: "c-tel-acc-coque",
    short: "Protection militaire MIL-STD, coins renforcés, compatible MagSafe.",
    desc: "Coque hybride TPU + polycarbonate, bords surélevés pour protéger l'écran et l'objectif, aimants intégrés.",
    price: 59, compare: 79, stock: 120, rating: 4.1, reviews_count: 12, created_at: "2026-04-18",
    tags: ["coque", "protection"],
    colors: [
      { id: "col-transparent", label: "Transparent", hex: "#dfe4e8" },
      { id: "col-noir", label: "Noir", hex: "#212124" },
    ],
    sizes: [
      { id: "sz-x5", label: "Nova X5" },
      { id: "sz-x5p", label: "Nova X5 Pro" },
    ],
  },
  {
    id: "p-8", name: "Machine à café Barista Pro", slug: "machine-a-cafe-barista-pro",
    brand: "Barista", category_id: "c-maison-cuisine-cafe",
    short: "Expresso 20 bars avec broyeur intégré et buse vapeur.",
    desc: "Broyeur conique 30 finesses, réservoir 2 L, préinfusion automatique et buse vapeur pro pour un lait velouté.",
    price: 1149, compare: 1390, stock: 4, rating: 4.6, reviews_count: 27, created_at: "2026-02-14",
    tags: ["cafe", "cuisine"],
  },
  {
    id: "p-9", name: "Montre connectée Pulse Fit 2", slug: "montre-connectee-pulse-fit-2",
    brand: "Pulse", category_id: "c-mode-montres",
    short: "AMOLED 1,43\", GPS, SpO2, 14 jours d'autonomie.",
    desc: "Suivi cardiaque continu, plus de 100 modes sportifs, GPS intégré, étanchéité 5 ATM et notifications intelligentes.",
    price: 389, compare: 459, stock: 31, is_new: true, rating: 4.2, reviews_count: 45, created_at: "2026-08-02",
    tags: ["montre", "sport"],
    colors: [
      { id: "col-noir", label: "Noir", hex: "#242427" },
      { id: "col-argent", label: "Argent", hex: "#c3c7cc" },
      { id: "col-rose", label: "Rose poudré", hex: "#d9a7a2" },
    ],
    sizes: [
      { id: "sz-41", label: "41 mm" },
      { id: "sz-45", label: "45 mm" },
    ],
  },
  {
    id: "p-10", name: "Sac à dos urbain Trail 24L", slug: "sac-a-dos-urbain-trail-24l",
    brand: "Trail", category_id: "c-mode-sacs",
    short: "Compartiment PC 16\", tissu déperlant, port USB.",
    desc: "Sac à dos pensé pour la ville : compartiment matelassé 16\", poche antivol dorsale, sangles ergonomiques et tissu recyclé déperlant.",
    price: 149, stock: 58, rating: 4.4, reviews_count: 33, created_at: "2026-05-19",
    tags: ["sac", "urbain"],
    colors: [
      { id: "col-gris", label: "Gris anthracite", hex: "#4b4f55" },
      { id: "col-kaki", label: "Kaki", hex: "#7d7f5c" },
    ],
  },
];

function buildProduct(seed: Seed): Product {
  const attributes: ProductAttribute[] = [];
  if (seed.colors) {
    attributes.push({
      id: `${seed.id}-attr-color`,
      name: "Couleur",
      code: "color",
      type: "swatch",
      values: seed.colors.map((c) => ({ id: c.id, label: c.label, hex: c.hex })),
    });
  }
  if (seed.sizes) {
    attributes.push({
      id: `${seed.id}-attr-size`,
      name: seed.sizes[0]!.label.includes("Go") ? "Capacité" : "Modèle / Taille",
      code: "size",
      type: "button",
      values: seed.sizes.map((s) => ({ id: s.id, label: s.label })),
    });
  }

  const realImageSet = {
    "p-1": [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80",
    ],
    "p-2": [
      "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80",
    ],
    "p-3": [
      "https://images.unsplash.com/photo-1511467685653-c1d4d2f2d4d8?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80",
    ],
    "p-4": [
      "https://images.unsplash.com/photo-1587502537745-84b86da1204f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1555618564-2725b263e173?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
    ],
    "p-5": [
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=900&q=80",
    ],
    "p-6": [
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1484704849707-f032a568e944?auto=format&fit=crop&w=900&q=80",
    ],
    "p-7": [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80",
    ],
    "p-8": [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=900&q=80",
    ],
    "p-9": [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=900&q=80",
    ],
    "p-10": [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    ],
  } as const;

  const images: ProductImage[] = [];
  const baseUrls = realImageSet[seed.id as keyof typeof realImageSet] ?? [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  ];

  if (seed.colors) {
    seed.colors.forEach((c, ci) => {
      const urls = baseUrls.length > 0 ? baseUrls : ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80"];
      images.push(
        {
          id: `${seed.id}-img-${c.id}-1`, product_id: seed.id,
          url: urls[ci % urls.length] ?? urls[0],
          alt: `${seed.name} — ${c.label}`, position: ci * 2, variant_value: c.id,
        },
        {
          id: `${seed.id}-img-${c.id}-2`, product_id: seed.id,
          url: urls[(ci + 1) % urls.length] ?? urls[0],
          alt: `${seed.name} — ${c.label} détail`, position: ci * 2 + 1, variant_value: c.id,
        },
      );
    });
  } else {
    images.push(
      { id: `${seed.id}-img-1`, product_id: seed.id, url: baseUrls[0] ?? "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80", alt: seed.name, position: 0, variant_value: null },
      { id: `${seed.id}-img-2`, product_id: seed.id, url: baseUrls[1] ?? "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80", alt: `${seed.name} détail`, position: 1, variant_value: null },
      { id: `${seed.id}-img-3`, product_id: seed.id, url: baseUrls[2] ?? "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80", alt: `${seed.name} packaging`, position: 2, variant_value: null },
    );
  }

  const variants: ProductVariant[] = [];
  const colorList = seed.colors ?? [null];
  const sizeList = seed.sizes ?? [null];
  colorList.forEach((c, ci) => {
    sizeList.forEach((s, si) => {
      if (!c && !s) return;
      const options: Record<string, string> = {};
      if (c) options["color"] = c.id;
      if (s) options["size"] = s.id;
      const bump = si * Math.round(seed.price * 0.12);
      variants.push({
        id: `${seed.id}-v-${ci}-${si}`,
        product_id: seed.id,
        sku: `${seed.id.toUpperCase()}-${ci}${si}`,
        options,
        price: seed.price + bump,
        compare_at_price: seed.compare ? seed.compare + bump : null,
        stock: seed.stock === 0 ? 0 : Math.max(0, seed.stock - ci * 2 - si * 3),
        is_active: true,
      });
    });
  });

  return {
    id: seed.id,
    name: seed.name,
    slug: seed.slug,
    brand: seed.brand,
    category_id: seed.category_id,
    short_description: seed.short,
    description: seed.desc,
    price: seed.price,
    compare_at_price: seed.compare ?? null,
    stock: seed.stock,
    sku: seed.id.toUpperCase(),
    is_active: true,
    is_new: seed.is_new ?? false,
    rating: seed.rating,
    reviews_count: seed.reviews_count,
    created_at: seed.created_at,
    images,
    attributes,
    variants,
    tags: seed.tags,
  };
}

export const products: Product[] = seeds.map(buildProduct);

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function searchProducts(query: string, list: Product[] = products) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return list.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q)),
  );
}

export function isOnSale(p: Product) {
  return p.compare_at_price !== null && p.compare_at_price > p.price;
}

export function discountPercent(p: Product) {
  if (!isOnSale(p)) return 0;
  return Math.round(((p.compare_at_price! - p.price) / p.compare_at_price!) * 100);
}
