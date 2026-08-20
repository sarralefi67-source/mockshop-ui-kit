import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CategoryNode } from "@/types";

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/**
 * Construit un arbre de catégories (parent -> enfants -> petits-enfants...)
 * à partir d'une liste plate.
 */
export function buildCategoryTreeFromRows(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      children: [],
    } as unknown as CategoryNode);
  }

  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (row.parent_id) {
      const parent = byId.get(row.parent_id);
      if (parent) {
        (parent.children as CategoryNode[]).push(node);
      } else {
        // parent absent (inactif ou introuvable) -> on remonte l'enfant à la racine
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

interface UseCategoriesResult {
  tree: CategoryNode[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Charge les catégories depuis Supabase et retourne l'arbre construit.
 */
export function useCategories(): UseCategoriesResult {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("categories")
        .select("id, parent_id, name, slug, description, image_url, created_at, updated_at")

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setTree([]);
        setLoading(false);
        return;
      }

      setTree(buildCategoryTreeFromRows((data ?? []) as CategoryRow[]));
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { tree, loading, error, refetch };
}