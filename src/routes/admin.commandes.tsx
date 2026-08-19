import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUS_LABELS } from "@/data/orders";
import type { Order, OrderStatus, OrderItem } from "@/types";
import { formatPrice } from "@/lib/placeholder";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/commandes")({
  component: AdminOrders,
});

const statusStyle: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-accent-strong/10 text-accent-strong",
  shipped: "bg-chart-2/15 text-chart-2",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  processing: "bg-accent/15 text-accent",
};

const statuses: string[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const allowedTransitions: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

type DraftOrderItem = {
  product_id: string;
  variant_id: string | null;
  name: string;
  variant_label: string | null;
  image: string;
  unit_price: number;
  quantity: number;
};

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category_id: string | null;
  short_description: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  sku: string;
  is_active: boolean;
  is_new: boolean;
  rating: number;
  reviews_count: number;
  created_at: string;
  images: Array<{
    id: string;
    product_id: string;
    url: string;
    alt: string;
    position: number;
    is_main?: boolean;
    variant_value: string | null;
  }>;
  attributes: Array<{
    id: string;
    name: string;
    code: string;
    type: "swatch" | "button";
    values: Array<{ id: string; label: string; hex?: string }>;
  }>;
  variants: Array<{
    id: string;
    product_id: string;
    sku: string;
    options: Record<string, string>;
    price: number;
    compare_at_price: number | null;
    stock: number;
    is_active: boolean;
    position?: number;
  }>;
  tags: string[];
};

const emptyOrderDraft = () => ({
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  governorate: "Tunis",
  payment_method: "card",
  status: "pending" as OrderStatus,
  coupon_code: "",
  note: "",
});

function AdminOrders() {
  const [list, setList] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Order | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [selectedOrderItems, setSelectedOrderItems] = useState<DraftOrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [productSearch, setProductSearch] = useState("");
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [draft, setDraft] = useState<ReturnType<typeof emptyOrderDraft>>(emptyOrderDraft());

  const getVariantLabel = (product: CatalogProduct | null, variant: CatalogProduct["variants"][number] | null | undefined) => {
    if (!product || !variant) return "Variation";

    const labelParts: string[] = [];
    product.attributes.forEach((attribute) => {
      const valueId = variant.options[attribute.id];
      if (!valueId) return;
      const value = attribute.values.find((item) => item.id === valueId);
      if (value) {
        labelParts.push(value.label);
      }
    });

    if (labelParts.length > 0) {
      return labelParts.join(" / ");
    }

    return variant.sku || product.sku || "Variation";
  };

  useEffect(() => {
    let mounted = true;
    async function loadCatalogProducts() {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_images(*),
          product_attributes(attribute_id, attributes(id, name, display_type, attribute_values(*))),
          product_variants(*, variant_attribute_values(attribute_value_id, attribute_values(id, value, color_hex, attribute_id, attributes(id, name))))
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        toast.error("Impossible de charger les produits depuis Supabase.");
        return;
      }

      if (!mounted) return;

      const mapped: CatalogProduct[] = (data ?? []).map((product: any) => {
        const attributes: CatalogProduct["attributes"] = (product.product_attributes ?? [])
          .map((pa: any) => pa.attributes)
          .filter(Boolean)
          .map((attribute: any) => ({
            id: attribute.id,
            name: attribute.name,
            code: attribute.id,
            type: attribute.display_type === "color_swatch" ? "swatch" : "button",
            values: (attribute.attribute_values ?? [])
              .slice()
              .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
              .map((value: any) => ({
                id: value.id,
                label: value.value,
                hex: value.color_hex ?? undefined,
              })),
          }));

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand ?? "",
          category_id: product.category_id ?? null,
          short_description: product.short_description ?? "",
          description: product.description ?? "",
          price: Number(product.base_price ?? product.price ?? 0),
          compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
          stock: Number(product.stock_quantity ?? 0),
          sku: product.sku ?? product.id,
          is_active: product.is_active ?? true,
          is_new: false,
          rating: 0,
          reviews_count: 0,
          created_at: product.created_at ?? new Date().toISOString(),
          images: ((product.product_images ?? []) as any[]).map((image) => ({
            id: image.id,
            product_id: image.product_id ?? product.id,
            url: image.url ?? "",
            alt: product.name,
            position: Number(image.position ?? 0),
            is_main: Boolean(image.is_main),
            variant_value: image.variant_value ?? null,
          })),
          attributes,
          variants: ((product.product_variants ?? []) as any[]).map((variant: any) => {
            const options = (variant.variant_attribute_values ?? []).reduce((acc: Record<string, string>, link: any) => {
              const value = link.attribute_values; 
              const attribute = attributes.find((entry) => entry.values.some((item) => item.id === value?.id));
              if (attribute && value) {
                acc[attribute.id] = value.id;
              }
              return acc;
            }, {});

            return {
              id: variant.id,
              product_id: variant.product_id ?? product.id,
              sku: variant.sku ?? variant.id,
              options,
              price: Number(variant.price ?? product.base_price ?? 0),
              compare_at_price: variant.compare_at_price ? Number(variant.compare_at_price) : null,
              stock: Number(variant.stock_quantity ?? 0),
              is_active: variant.is_active ?? true,
              position: Number(variant.position ?? 0),
            };
          }),
          tags: [],
        };
      });

      setCatalogProducts(mapped);
    }

    loadCatalogProducts();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error("Impossible de charger les commandes depuis Supabase.");
        return;
      }
      if (!mounted) return;
      const mapped: Order[] = (data ?? []).map((r: any) => ({
        id: r.id,
        reference: r.order_number,
        customer_name: (r.shipping_address && (r.shipping_address.full_name || r.shipping_address.name)) || "Client",
        customer_phone: (r.shipping_address && (r.shipping_address.phone || r.shipping_address.mobile)) || "",
        status: (r.status as OrderStatus) || "pending",
        payment_method: r.payment_method || "",
        subtotal: r.subtotal ?? 0,
        shipping: r.shipping_amount ?? 0,
        discount: r.discount_amount ?? 0,
        total: r.total ?? 0,
        governorate: (r.shipping_address && (r.shipping_address.governorate || r.shipping_address.city)) || "",
        created_at: r.created_at,
        items: (r.order_items || []).map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          variant_id: it.variant_id,
          name: it.product_name || it.product_id || "Article",
          variant_label: it.variant_label || null,
          image: "",
          unit_price: it.unit_price ?? 0,
          quantity: it.quantity ?? 1,
        })),
      }));
      setList(mapped);
    }
    load();
    return () => { mounted = false };
  }, []);

  const filtered = list.filter((o) => {
    const matchSearch =
      o.reference.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filter === "all" || o.status === filter;
    return matchSearch && matchStatus;
  });

  const changeStatus = async (id: string, status: OrderStatus) => {
    // Optimistic update
    setList((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    setDetail((d: Order | null) => (d && d.id === id ? { ...d, status } : d));
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      console.error(error);
      toast.error("Impossible de mettre à jour le statut.");
      // revert by reloading list
      const { data } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (data) {
        const mapped: Order[] = (data ?? []).map((r: any) => ({
          id: r.id,
          reference: r.order_number,
          customer_name: (r.shipping_address && (r.shipping_address.full_name || r.shipping_address.name)) || "Client",
          customer_phone: (r.shipping_address && (r.shipping_address.phone || r.shipping_address.mobile)) || "",
          status: (r.status as OrderStatus) || "pending",
          payment_method: r.payment_method || "",
          subtotal: r.subtotal ?? 0,
          shipping: r.shipping_amount ?? 0,
          discount: r.discount_amount ?? 0,
          total: r.total ?? 0,
          governorate: (r.shipping_address && (r.shipping_address.governorate || r.shipping_address.city)) || "",
          created_at: r.created_at,
          items: (r.order_items || []).map((it: any) => ({
            id: it.id,
            product_id: it.product_id,
            variant_id: it.variant_id,
            name: it.product_name || it.product_id || "Article",
            variant_label: it.variant_label || null,
            image: "",
            unit_price: it.unit_price ?? 0,
            quantity: it.quantity ?? 1,
          })),
        }));
        setList(mapped);
      }
      return;
    }
    toast.success(`Statut mis à jour : ${(ORDER_STATUS_LABELS as any)[status] ?? status}`);
  };

  const exportPDF = (rows: Order[]) => {
    const dateLabel = new Date().toLocaleString();
    const rowsHtml = rows
      .map((r) => {
        const items = r.items.map((it) => `${it.name} x${it.quantity}`).join("; ");
        const date = r.created_at ? new Date(r.created_at).toLocaleString() : "";
        return `
          <tr>
            <td>${escapeHtml(r.reference)}</td>
            <td>${escapeHtml(r.customer_name)}</td>
            <td>${escapeHtml(r.governorate)}</td>
            <td>${escapeHtml(date)}</td>
            <td style="text-align:right">${escapeHtml(String(r.total))}</td>
            <td>${escapeHtml(String(r.status))}</td>
            <td>${escapeHtml(items)}</td>
          </tr>`;
      })
      .join("\n");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Export commandes</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:6px;font-size:12px}th{background:#f3f4f6;text-align:left}</style></head><body><h1>Export commandes — ${escapeHtml(dateLabel)}</h1><table><thead><tr><th>Référence</th><th>Client</th><th>Gouvernorat</th><th>Date</th><th>Total</th><th>Statut</th><th>Articles</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Impossible d'ouvrir la fenêtre d'export.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    // Trigger the print dialog so user can save as PDF
    setTimeout(() => w.print(), 300);
  };

  const addOrderItem = (product: CatalogProduct) => {
    const variant =
      product.variants && product.variants.length > 0
        ? product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0]
        : null;
    const price = Number(variant ? variant.price : product.price ?? 0);
    const image = product.images?.find((img) => img.is_main)?.url ?? product.images?.[0]?.url ?? "";
    const sku = variant?.sku ?? product.sku ?? product.id;
    const variantLabel = getVariantLabel(product, variant) || sku;
    const itemQty = Math.max(1, Number(selectedQty) || 1);

    setSelectedOrderItems((prev) => {
      const current = prev.find((item) => item.product_id === product.id && item.variant_id === (variant?.id ?? null));
      if (current) {
        return prev.map((item) => item.product_id === product.id && item.variant_id === (variant?.id ?? null)
          ? { ...item, quantity: item.quantity + itemQty }
          : item);
      }
      return [
        ...prev,
        {
          product_id: product.id,
          variant_id: variant?.id ?? null,
          name: product.name,
          variant_label: variantLabel,
          image,
          unit_price: price,
          quantity: itemQty,
        },
      ];
    });

    setSelectedQty(1);
    setSelectedVariantId("");
  };

  const selectedProductIds = selectedOrderItems.map((item) => item.product_id);
  const selectedProduct = catalogProducts.find((product) => product.id === selectedProductId) ?? null;
  const selectedProductVariants = selectedProduct?.variants ?? [];
  const filteredCatalogProducts = catalogProducts.filter((product) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      product.name.toLowerCase().includes(q) ||
      (product.sku || product.id).toLowerCase().includes(q)
    );
  });
  const displayedProductValue = selectedProduct ? selectedProduct.name : productSearch;

  const updateOrderItemQty = (productId: string, delta: number) => {
    setSelectedOrderItems((prev) =>
      prev
        .map((item) => item.product_id === productId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item)
        .filter((item) => item.quantity > 0),
    );
  };

  const removeOrderItem = (productId: string) => {
    setSelectedOrderItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const createOrder = async () => {
    const customerName = draft.customer_name.trim();
    if (!customerName) {
      toast.error("Le nom du client est requis.");
      return;
    }
    if (selectedOrderItems.length === 0) {
      toast.error("Ajoute au moins un article pour créer la commande.");
      return;
    }

    const subtotal = selectedOrderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const shipping = 0;
    const couponDiscount = draft.coupon_code.trim() ? Math.min(subtotal * 0.1, 50) : 0;
    const total = subtotal + shipping - couponDiscount;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const payload = {
      order_number: orderNumber,
      status: draft.status,
      subtotal,
      discount_amount: couponDiscount,
      shipping_amount: shipping,
      total,
      payment_method: draft.payment_method,
      shipping_address: {
        full_name: customerName,
        phone: draft.customer_phone,
        governorate: draft.governorate,
        city: draft.governorate,
        address_line: "",
      },
      notes: draft.note.trim() || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("orders").insert(payload).select().single();
    if (error) {
      console.error(error);
      toast.error("Impossible de créer la commande.");
      return;
    }

    const orderItemsPayload = selectedOrderItems.map((item) => ({
      order_id: data.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.name,
      variant_label: item.variant_label,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.unit_price * item.quantity,
      sku: item.variant_id ?? item.product_id,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
    if (itemsError) {
      console.error(itemsError);
      toast.error("La commande a été créée mais les articles n'ont pas pu être enregistrés.");
      return;
    }

    const result = data as any;
    const shippingAddress = (result?.shipping_address ?? {}) as Record<string, any>;

    const created = {
      id: result.id,
      reference: result.order_number,
      customer_name: shippingAddress["full_name"] || shippingAddress["name"] || customerName,
      customer_phone: shippingAddress["phone"] || shippingAddress["mobile"] || draft.customer_phone,
      status: (result.status as OrderStatus) || "pending",
      payment_method: result.payment_method || "cod",
      subtotal: result.subtotal ?? subtotal,
      shipping: result.shipping_amount ?? shipping,
      discount: result.discount_amount ?? couponDiscount,
      total: result.total ?? total,
      governorate: shippingAddress["governorate"] || shippingAddress["city"] || draft.governorate,
      created_at: result.created_at,
      items: selectedOrderItems.map((item) => ({
        id: `${result.id}-${item.product_id}`,
        product_id: item.product_id,
        variant_id: item.variant_id,
        name: item.name,
        variant_label: item.variant_label,
        image: item.image,
        unit_price: item.unit_price,
        quantity: item.quantity,
      })),
    } satisfies Order;

    setList((prev) => [created, ...prev]);
    setAddOpen(false);
    setCreateStep(1);
    setSelectedOrderItems([]);
    setDraft(emptyOrderDraft());
    toast.success(`Commande ${created.reference} créée.`);
  };

  const summarySubtotal = selectedOrderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const summaryCoupon = draft.coupon_code.trim() ? Math.min(summarySubtotal * 0.1, 50) : 0;
  const summaryShipping = 0;
  const summaryTotal = summarySubtotal + summaryShipping - summaryCoupon;

  // simple HTML escaper
  const escapeHtml = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Commandes</h1>
          <p className="text-sm text-muted-foreground">
            {list.length} commandes — toutes en paiement à la livraison.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Réf. ou client…" className="w-80 sm:w-96" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>{(ORDER_STATUS_LABELS as any)[s] ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="accent" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Nouvelle commande
            </Button>
            <Button onClick={() => exportPDF(filtered)} className="bg-blue-600 text-white hover:bg-blue-700">
              <Download className="h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Gouvernorat</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Détail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center text-muted-foreground">
                  Aucune commande ne correspond à ces critères.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.reference}</TableCell>
                  <TableCell>
                    <p>{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.governorate}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString("fr-FR") : ""}
                  </TableCell>
                  <TableCell className="font-semibold">{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => changeStatus(o.id, v as OrderStatus)}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statuses
                          .filter((s) => s === o.status || (allowedTransitions[o.status] || []).includes(s))
                          .map((s) => (
                            <SelectItem key={s} value={s}>{(ORDER_STATUS_LABELS as any)[s] ?? s}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setDetail(o)}>
                      <Eye className="h-4 w-4" /> Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={(o) => {
        setAddOpen(o);
        if (!o) {
          setCreateStep(1);
          setSelectedOrderItems([]);
          setDraft(emptyOrderDraft());
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nouvelle commande</DialogTitle>
          </DialogHeader>

          {createStep === 1 && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Client</Label>
                <Input value={draft.customer_name} onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })} placeholder="Nom et prénom" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email client</Label>
                  <Input type="email" value={draft.customer_email} onChange={(e) => setDraft({ ...draft, customer_email: e.target.value })} placeholder="client@email.com" />
                </div>

                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={draft.customer_phone} onChange={(e) => setDraft({ ...draft, customer_phone: e.target.value })} placeholder="+216 ..." />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gouvernorat</Label>
                  <Input value={draft.governorate} onChange={(e) => setDraft({ ...draft, governorate: e.target.value })} placeholder="Tunis" />
                </div>

                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as OrderStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{(ORDER_STATUS_LABELS as any)[s] ?? s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
                <div className="space-y-2">
                  <Label>Produit</Label>
                  <div className="relative">
                    <Input
                      value={displayedProductValue}
                      onFocus={() => setIsProductMenuOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setIsProductMenuOpen(false), 120);
                      }}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setSelectedProductId("");
                        setSelectedVariantId("");
                        setIsProductMenuOpen(true);
                      }}
                      placeholder="Rechercher un produit"
                    />

                    {isProductMenuOpen && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-background shadow-md">
                        {filteredCatalogProducts.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Aucun produit trouvé.</div>
                        ) : (
                          filteredCatalogProducts.map((product) => (
                            <button
                              type="button"
                              key={product.id}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSelectedProductId(product.id);
                                setProductSearch(product.name);
                                setIsProductMenuOpen(false);
                                const firstVariant = product?.variants?.[0];
                                if (firstVariant) {
                                  setSelectedVariantId(firstVariant.id);
                                } else {
                                  setSelectedVariantId("");
                                }
                              }}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-accent/10 ${selectedProductId === product.id ? "bg-accent/10 text-accent" : "text-foreground"}`}
                            >
                              <span className="truncate">{product.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">{product.sku || product.id}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Quantité</Label>
                  <Input type="number" min={1} value={selectedQty} onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value) || 1))} />
                </div>
              </div>

              {selectedProduct && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  <img
                    src={selectedProduct.images?.find((image) => image.is_main)?.url ?? selectedProduct.images?.[0]?.url ?? ""}
                    alt={selectedProduct.name}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedProduct.sku || selectedProduct.id} · {formatPrice(selectedProduct.price)}</p>
                  </div>
                </div>
              )}

              {selectedProductVariants.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">Variantes</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProductVariants.map((variant) => (
                      <button
                        type="button"
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs ${selectedVariantId === variant.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-background"}`}
                      >
                        {getVariantLabel(selectedProduct, variant)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="accent"
                  disabled={!selectedProduct}
                  onClick={() => {
                    if (!selectedProduct) return;
                    addOrderItem(selectedProduct);
                  }}
                >
                  Ajouter au panier
                </Button>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-3 text-sm font-medium">Articles sélectionnés</p>
                {selectedOrderItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun article sélectionné.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedOrderItems.map((item) => (
                      <div key={`${item.product_id}-${item.variant_id ?? "base"}`} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-2">
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt={item.name} className="h-10 w-10 rounded-md object-cover" />
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.variant_label ?? "SKU non défini"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="icon" onClick={() => updateOrderItemQty(item.product_id, -1)}>-</Button>
                          <span className="w-5 text-center text-sm">{item.quantity}</span>
                          <Button type="button" variant="outline" size="icon" onClick={() => updateOrderItemQty(item.product_id, 1)}>+</Button>
                          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeOrderItem(item.product_id)}>
                            Retirer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Client</span>
                    <span className="rounded-full bg-accent/10 px-2 py-1 text-xs text-accent">{draft.status}</span>
                  </div>
                  <p className="font-medium">{draft.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{draft.customer_email || "—"}</p>
                  <p className="text-sm text-muted-foreground">{draft.customer_phone || "—"}</p>
                  <p className="text-sm text-muted-foreground">{draft.governorate}</p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="mb-3 font-semibold">Résumé</p>
                  <div className="space-y-2">
                    {selectedOrderItems.map((item) => (
                      <div key={`${item.product_id}-${item.variant_id ?? "base"}`} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-2 py-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <img src={item.image} alt={item.name} className="h-8 w-8 rounded object-cover" />
                          <span>{item.name} × {item.quantity}</span>
                        </div>
                        <span>{formatPrice(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between"><span>Sous-total</span><span>{formatPrice(summarySubtotal)}</span></div>
                    {summaryCoupon > 0 && (
                      <div className="flex justify-between text-accent-strong"><span>Coupon</span><span>-{formatPrice(summaryCoupon)}</span></div>
                    )}
                    <div className="flex justify-between"><span>Livraison</span><span>{formatPrice(summaryShipping)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPrice(summaryTotal)}</span></div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="space-y-2">
                  <Label>Coupon</Label>
                  <Input value={draft.coupon_code} onChange={(e) => setDraft({ ...draft, coupon_code: e.target.value.toUpperCase() })} placeholder="EX: SAVE10" />
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea rows={7} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Indications de livraison, point de repère..." />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {createStep === 1 && (
              <>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
                <Button variant="accent" onClick={() => {
                  const customerName = draft.customer_name.trim();
                  if (!customerName) {
                    toast.error("Le nom du client est requis.");
                    return;
                  }
                  setCreateStep(2);
                }}>Suivant</Button>
              </>
            )}

            {createStep === 2 && (
              <>
                <Button variant="outline" onClick={() => setCreateStep(1)}>Retour</Button>
                <Button variant="accent" onClick={() => {
                  if (selectedOrderItems.length === 0) {
                    toast.error("Ajoute au moins un article.");
                    return;
                  }
                  setCreateStep(3);
                }}>Suivant</Button>
              </>
            )}

            {createStep === 3 && (
              <>
                <Button variant="outline" onClick={() => setCreateStep(2)}>Retour</Button>
                <Button variant="accent" onClick={createOrder}>Créer</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Commande {detail?.reference}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{detail.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{detail.customer_phone}</p>
                  <p className="text-sm text-muted-foreground">{detail.governorate}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusStyle[detail.status])}>
                  {(ORDER_STATUS_LABELS as any)[detail.status] ?? detail.status}
                </span>
              </div>

              <ul className="space-y-3 border-t border-border pt-4">
                {detail.items.map((item: OrderItem) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <img src={item.image} alt="" className="h-12 w-12 rounded-md border border-border object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {item.variant_label && <p className="text-xs text-muted-foreground">{item.variant_label}</p>}
                    </div>
                    <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                    <span className="text-sm font-semibold">{formatPrice(item.unit_price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-1 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{formatPrice(detail.subtotal)}</dd></div>
                {detail.discount > 0 && (
                  <div className="flex justify-between text-accent-strong"><dt>Remise</dt><dd>-{formatPrice(detail.discount)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-muted-foreground">Livraison</dt><dd>{formatPrice(detail.shipping)}</dd></div>
                <div className="flex justify-between font-bold"><dt>Total (COD)</dt><dd>{formatPrice(detail.total)}</dd></div>
              </dl>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Changer le statut</p>
                <Select value={detail.status} onValueChange={(v) => changeStatus(detail.id, v as OrderStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>

                  <SelectContent>
                    {statuses
                      .filter((s) => s === detail.status || (allowedTransitions[detail.status] || []).includes(s))
                      .map((s) => (
                        <SelectItem key={s} value={s}>{(ORDER_STATUS_LABELS as any)[s] ?? s}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
