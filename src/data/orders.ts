import type { Address, Customer, Order, OrderStatus } from "@/types";
import { mockImage } from "@/lib/placeholder";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-sky-100 text-sky-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-orange-100 text-orange-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export const orders: Order[] = [
  {
    id: "o-1", reference: "CMD-2026-1042", customer_name: "Sarra Lefi", customer_phone: "+216 22 145 887",
    status: "delivered", payment_method: "cod", subtotal: 648, shipping: 7, discount: 64.8, total: 590.2,
    governorate: "Tunis", created_at: "2026-07-28",
    items: [
      { id: "oi-1", product_id: "p-6", variant_id: "p-6-v-0-0", name: "Casque sans fil AudioPulse ANC", variant_label: "Noir", image: mockImage("AudioPulse", "#26262a", "Noir"), unit_price: 429, quantity: 1 },
      { id: "oi-2", product_id: "p-7", variant_id: "p-7-v-1-0", name: "Coque renforcée ArmorFit", variant_label: "Noir / Nova X5", image: mockImage("ArmorFit", "#212124", "Noir"), unit_price: 59, quantity: 1 },
      { id: "oi-3", product_id: "p-10", variant_id: "p-10-v-0-0", name: "Sac à dos urbain Trail 24L", variant_label: "Gris anthracite", image: mockImage("Trail", "#4b4f55", "Gris"), unit_price: 149, quantity: 1 },
    ],
  },
  {
    id: "o-2", reference: "CMD-2026-1078", customer_name: "Sarra Lefi", customer_phone: "+216 22 145 887",
    status: "shipped", payment_method: "cod", subtotal: 1299, shipping: 7, discount: 0, total: 1306,
    governorate: "Tunis", created_at: "2026-08-09",
    items: [
      { id: "oi-4", product_id: "p-5", variant_id: "p-5-v-1-0", name: "Smartphone Nova X5 128 Go", variant_label: "Vert sauge / 128 Go", image: mockImage("Nova", "#7c9a80", "Vert sauge"), unit_price: 1299, quantity: 1 },
    ],
  },
  {
    id: "o-3", reference: "CMD-2026-1085", customer_name: "Walid Gharbi", customer_phone: "+216 98 334 210",
    status: "pending", payment_method: "cod", subtotal: 899, shipping: 7, discount: 0, total: 906,
    governorate: "Sousse", created_at: "2026-08-15",
    items: [
      { id: "oi-5", product_id: "p-2", variant_id: null, name: "Écran Gaming Orbit 27\" 165 Hz", variant_label: null, image: mockImage("Orbit", "#cfd4da", "Orbit"), unit_price: 899, quantity: 1 },
    ],
  },
  {
    id: "o-4", reference: "CMD-2026-1090", customer_name: "Emna Ben Salah", customer_phone: "+216 55 908 771",
    status: "confirmed", payment_method: "cod", subtotal: 438, shipping: 7, discount: 0, total: 445,
    governorate: "Sfax", created_at: "2026-08-16",
    items: [
      { id: "oi-6", product_id: "p-3", variant_id: "p-3-v-0-0", name: "Clavier mécanique Kinetic TKL", variant_label: "Blanc", image: mockImage("Kinetic", "#f2f2f0", "Blanc"), unit_price: 219, quantity: 2 },
    ],
  },
  {
    id: "o-5", reference: "CMD-2026-1091", customer_name: "Hatem Jaziri", customer_phone: "+216 71 220 145",
    status: "cancelled", payment_method: "cod", subtotal: 1149, shipping: 7, discount: 0, total: 1156,
    governorate: "Nabeul", created_at: "2026-08-16",
    items: [
      { id: "oi-7", product_id: "p-8", variant_id: null, name: "Machine à café Barista Pro", variant_label: null, image: mockImage("Barista", "#cfd4da", "Barista"), unit_price: 1149, quantity: 1 },
    ],
  },
];

export const currentCustomer: Customer = {
  id: "u-1",
  first_name: "Sarra",
  last_name: "Lefi",
  email: "sarra.lefi@example.tn",
  phone: "+216 22 145 887",
  newsletter: true,
};

export const addresses: Address[] = [
  { id: "a-1", label: "Domicile", full_name: "Sarra Lefi", phone: "+216 22 145 887", line1: "12 rue de la Liberté, Apt 4", city: "Le Bardo", governorate: "Tunis", postal_code: "2000", is_default: true },
  { id: "a-2", label: "Bureau", full_name: "Sarra Lefi", phone: "+216 22 145 887", line1: "Immeuble Yasmine, Av. Habib Bourguiba", city: "Sousse", governorate: "Sousse", postal_code: "4000", is_default: false },
];

export const dashboardStats = {
  revenue: 48250,
  orders: 312,
  customers: 187,
  averageBasket: 154.6,
  salesByMonth: [
    { month: "Mar", total: 5200 },
    { month: "Avr", total: 6100 },
    { month: "Mai", total: 7400 },
    { month: "Juin", total: 6800 },
    { month: "Juil", total: 9600 },
    { month: "Août", total: 13150 },
  ],
};
