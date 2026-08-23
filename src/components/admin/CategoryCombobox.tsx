import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type CategoryOption = { id: string; parent_id: string | null; name: string };

/** Au-delà, on demande à l'utilisateur d'affiner : la liste reste lisible même
 *  avec plusieurs centaines de catégories. */
const MAX_VISIBLE = 10;

type FlatCategory = { id: string; name: string; depth: number; path: string[] };

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Aplatit l'arborescence en parcours préfixe : chaque catégorie est suivie de
 * ses descendantes, avec sa profondeur et le chemin de ses ancêtres.
 */
function flattenTree(categories: CategoryOption[]): FlatCategory[] {
  // Une catégorie racine se référence elle-même en base
  // (cf. database/categories-parent-id.sql) : on ramène ça à null.
  const nodes = categories.map((c) => ({
    ...c,
    parent_id: c.parent_id === c.id ? null : c.parent_id,
  }));
  const known = new Set(nodes.map((n) => n.id));
  const byParent = new Map<string | null, typeof nodes>();
  nodes.forEach((node) => {
    // Un parent introuvable (supprimé) ne doit pas faire disparaître l'enfant :
    // on le remonte à la racine plutôt que de le perdre.
    const key = node.parent_id && known.has(node.parent_id) ? node.parent_id : null;
    byParent.set(key, [...(byParent.get(key) ?? []), node]);
  });

  const out: FlatCategory[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number, path: string[]) => {
    const children = [...(byParent.get(parent) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, "fr"),
    );
    for (const child of children) {
      if (seen.has(child.id)) continue; // garde-fou : cycle dans les données
      seen.add(child.id);
      out.push({ id: child.id, name: child.name, depth, path });
      walk(child.id, depth + 1, [...path, child.name]);
    }
  };
  walk(null, 0, []);
  return out;
}

const fullLabel = (category: FlatCategory) =>
  category.path.length > 0 ? `${category.path.join(" › ")} › ${category.name}` : category.name;

export function CategoryCombobox({
  id,
  categories,
  value,
  onChange,
  invalid = false,
  placeholder = "Choisir une catégorie",
}: {
  id?: string;
  categories: CategoryOption[];
  value: string | null;
  onChange: (categoryId: string) => void;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const flat = useMemo(() => flattenTree(categories), [categories]);
  const selected = flat.find((c) => c.id === value) ?? null;

  // La recherche porte sur le chemin complet : taper « poterie » remonte aussi
  // « Décoration Maison › Poterie et Céramique ».
  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return flat;
    return flat.filter((c) => normalize(fullLabel(c)).includes(q));
  }, [flat, query]);

  const visible = matches.slice(0, MAX_VISIBLE);
  const hidden = matches.length - visible.length;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            invalid && "border-destructive",
          )}
        >
          <span className="truncate">{selected ? fullLabel(selected) : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {/* Filtrage maison (chemin complet + plafond), donc cmdk ne filtre pas. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher une catégorie…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[19rem]">
            <CommandEmpty>Aucune catégorie ne correspond.</CommandEmpty>
            <CommandGroup>
              {visible.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.id}
                  onSelect={() => {
                    onChange(category.id);
                    setOpen(false);
                  }}
                  className="items-start"
                >
                  <Check
                    className={cn(
                      "mr-2 mt-0.5 h-4 w-4 shrink-0",
                      value === category.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className="min-w-0 flex-1"
                    style={{ paddingInlineStart: `${category.depth * 0.875}rem` }}
                  >
                    <span className="block truncate">{category.name}</span>
                    {category.path.length > 0 && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {category.path.join(" › ")}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {hidden > 0 && (
            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {hidden} autre{hidden > 1 ? "s" : ""} catégorie{hidden > 1 ? "s" : ""} — affinez la
              recherche.
            </p>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
