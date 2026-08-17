import type { Review } from "@/types";

export const reviews: Review[] = [
  { id: "r-1", product_id: "p-1", author: "Mehdi B.", rating: 5, title: "Excellent rapport qualité/prix", body: "Machine très fluide, le clavier est agréable et la batterie tient une journée complète de travail.", created_at: "2026-06-12", verified: true },
  { id: "r-2", product_id: "p-1", author: "Sonia K.", rating: 4, title: "Bon PC mais ventilation audible", body: "Rien à dire sur les performances. Les ventilateurs se font entendre en charge lourde.", created_at: "2026-07-01", verified: true },
  { id: "r-3", product_id: "p-3", author: "Youssef T.", rating: 5, title: "Le meilleur clavier que j'ai eu", body: "Switches très agréables, le format TKL est parfait sur un petit bureau.", created_at: "2026-08-04", verified: false },
  { id: "r-4", product_id: "p-5", author: "Ines M.", rating: 4, title: "Très bon écran", body: "L'AMOLED 120 Hz est superbe. La photo de nuit reste moyenne.", created_at: "2026-08-08", verified: true },
  { id: "r-5", product_id: "p-5", author: "Karim Z.", rating: 5, title: "Charge ultra rapide", body: "40 minutes pour une charge complète, exactement comme annoncé.", created_at: "2026-08-10", verified: true },
  { id: "r-6", product_id: "p-6", author: "Rania H.", rating: 5, title: "ANC efficace", body: "Parfait dans les transports, très confortable même après 3 heures.", created_at: "2026-07-19", verified: true },
  { id: "r-7", product_id: "p-9", author: "Ahmed D.", rating: 4, title: "Autonomie au top", body: "Je la recharge une fois par semaine. Le GPS met parfois du temps à accrocher.", created_at: "2026-08-12", verified: false },
  { id: "r-8", product_id: "p-2", author: "Nadia F.", rating: 4, title: "Belle dalle", body: "Couleurs justes dès la sortie de boîte, pied très stable.", created_at: "2026-07-05", verified: true },
];

export function reviewsForProduct(productId: string) {
  return reviews.filter((r) => r.product_id === productId);
}
