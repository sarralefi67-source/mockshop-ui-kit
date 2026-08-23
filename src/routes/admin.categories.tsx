import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useRef, useState, Fragment } from "react";
import {
  Pencil,
  Plus,
  Trash2,
  Eye,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import type { Category } from "@/types";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { uploadToBucket, deleteFromBucket } from "@/lib/storage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { randomUUID } from "@/lib/uid";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});


/* =========================================================
   EMPTY CATEGORY
========================================================= */

const empty: Category = {
  id: "",
  parent_id: null,
  name: "",
  slug: "",
  description: "",
  image_url: null,
};


/* =========================================================
   CONSTANTS
========================================================= */

const MAX_IMAGE_MB = 5;


/* =========================================================
   COMPONENT
========================================================= */

function AdminCategories() {
  const { profile } = useAuth();

  const [list, setList] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Category>(empty);

  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const [viewCategory, setViewCategory] =
    useState<Category | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] =
    useState<string | null>(null);

  const [expandedMap, setExpandedMap] =
    useState<Record<string, boolean>>({});

  const [dragId, setDragId] =
    useState<string | null>(null);

  const [dragOverId, setDragOverId] =
    useState<string | null>(null);

  const [selectedCategoryIds, setSelectedCategoryIds] =
    useState<string[]>([]);

  const [confirmDeleteIds, setConfirmDeleteIds] =
    useState<string[]>([]);

  const [isBulkDeleting, setIsBulkDeleting] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [parentSearch, setParentSearch] = useState("");
  const [parentOptions, setParentOptions] = useState<Category[]>([]);
  const [parentMenuOpen, setParentMenuOpen] = useState(false);
  const [nameError, setNameError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);


  /* =========================================================
     TOGGLE EXPANSION
  ========================================================= */

  const toggleExpanded = (id: string) => {
    setExpandedMap((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };


  /* =========================================================
     NORMALIZE CATEGORY
  ========================================================= */

  const normalizeCategory = (row: any): Category => ({
    id: row.id,
    parent_id: row.parent_id ?? row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    image_url: row.image_url ?? null,
    subcategories_count: row.subcategories_count ?? 0,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  });


  /* =========================================================
     LOAD CATEGORIES
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("updated_at", { ascending: false, nullsFirst: false });

        if (error) throw error;

        if (!mounted) return;

        const normalized: Category[] =
          (data ?? []).map(normalizeCategory);

        setList(normalized);

      } catch (err) {
        console.error(
          "load categories error:",
          err
        );

        setList([]);

        toast.error(
          "Impossible de charger les catégories depuis Supabase."
        );

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!parentMenuOpen) return;

    let active = true;
    const loadParentOptions = async () => {
      let query = supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true })
        .limit(30);

      const term = parentSearch.trim();
      if (term) query = query.ilike("name", `%${term}%`);

      const { data, error } = await query;
      if (error) {
        console.error("load parent categories", error);
        return;
      }

      if (active) setParentOptions((data ?? []).map(normalizeCategory));
    };

    loadParentOptions();
    return () => { active = false; };
  }, [parentMenuOpen, parentSearch]);


  /* =========================================================
     SEARCH
  ========================================================= */

  const compareUpdatedAt = (a: Category, b: Category) => {
    const aUpdated = a.updated_at ? Date.parse(a.updated_at) : 0;
    const bUpdated = b.updated_at ? Date.parse(b.updated_at) : 0;
    return bUpdated - aUpdated;
  };

  const filtered = list
    .filter((category) =>
      category.name
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort(compareUpdatedAt);


  /* =========================================================
     ROOT CATEGORIES
     
     IMPORTANT:
     parent_id === null = catégorie principale
  ========================================================= */

  const topLevel = filtered.filter(
  (category) => category.parent_id === category.id
  );


  /*
   * Normalement on affiche uniquement les racines.
   * Si la recherche correspond uniquement à une sous-catégorie,
   * on affiche quand même les résultats.
   */

  const displayRoots =
    search.trim().length > 0
      ? topLevel.length > 0
        ? topLevel
        : filtered
      : topLevel;

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(displayRoots.length / pageSize));
  const paginatedRoots = displayRoots.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, displayRoots.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);


  /* =========================================================
     SLUGIFY
  ========================================================= */

  const slugify = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const sanitizeFileName = (fileName: string) => {
    const extension = fileName.includes(".")
      ? `.${fileName.split(".").pop()!.toLowerCase()}`
      : "";
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    return `${slugify(baseName) || "image"}${extension}`;
  };


  /* =========================================================
     CHECK DESCENDANT
  ========================================================= */

  const isDescendant = (
    categoryId: string,
    ancestorId: string
  ): boolean => {
    const visited = new Set<string>();

    let currentId: string | null = categoryId;

    while (
      currentId &&
      !visited.has(currentId)
    ) {
      visited.add(currentId);

      const category = list.find(
        (item) => item.id === currentId
      );

      if (!category) return false;

      if (category.parent_id === ancestorId) {
        return true;
      }

      currentId = category.parent_id;
    }

    return false;
  };


  /* =========================================================
     AVAILABLE PARENTS
     
     Prevent:
     - category selecting itself
     - category selecting one of its descendants
  ========================================================= */

  const availableParents = list.filter(
    (category) =>
      category.id !== draft.id &&
      !isDescendant(category.id, draft.id)
  );


  /* =========================================================
     SELECTION
  ========================================================= */

  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((category) =>
      selectedCategoryIds.includes(category.id)
    );


  const toggleCategorySelection = (
    id: string,
    checked: boolean
  ) => {
    setSelectedCategoryIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter(
            (categoryId) =>
              categoryId !== id
          )
    );
  };


  const toggleAllVisibleCategories = (
    checked: boolean
  ) => {
    if (checked) {
      setSelectedCategoryIds((current) =>
        [
          ...new Set([
            ...current,
            ...filtered.map(
              (category) => category.id
            ),
          ]),
        ]
      );
    } else {
      const visibleIds = new Set(
        filtered.map(
          (category) => category.id
        )
      );

      setSelectedCategoryIds((current) =>
        current.filter(
          (id) => !visibleIds.has(id)
        )
      );
    }
  };


  /* =========================================================
     BULK DELETE
  ========================================================= */

  const deleteSelectedCategories = async () => {
    if (confirmDeleteIds.length === 0) return;

    setIsBulkDeleting(true);
    setLoading(true);

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .in("id", confirmDeleteIds);

      if (error) throw error;

      const deletedIds = new Set(
        confirmDeleteIds
      );

      setList((current) =>
        current.filter(
          (category) =>
            !deletedIds.has(category.id)
        )
      );

      setSelectedCategoryIds((current) =>
        current.filter(
          (id) => !deletedIds.has(id)
        )
      );

      toast.success(
        `${confirmDeleteIds.length} catégorie${
          confirmDeleteIds.length > 1
            ? "s"
            : ""
        } supprimée${
          confirmDeleteIds.length > 1
            ? "s"
            : ""
        }.`
      );

    } catch (err) {
      console.error(
        "delete selected categories",
        err
      );

      toast.error(
        "Impossible de supprimer les catégories sélectionnées."
      );

    } finally {
      setIsBulkDeleting(false);
      setLoading(false);
      setConfirmDeleteIds([]);
    }
  };


  /* =========================================================
     RENDER TREE
  ========================================================= */

  const renderRow = (
    category: Category,
    level = 0,
    path = new Set<string>()
  ): React.ReactNode => {

    /*
     * Protection contre une boucle parent_id
     */
    if (path.has(category.id)) {
      return null;
    }

    const nextPath = new Set(path);
    nextPath.add(category.id);

    /*
     * IMPORTANT:
     * children = catégories dont parent_id
     * correspond à l'id actuel.
     */
    const children = list
      .filter(
        (item) =>
          item.parent_id === category.id &&
          item.id !== category.id
      )
      .sort(compareUpdatedAt);

    const isExpanded =
      !!expandedMap[category.id];


    return (
      <Fragment key={category.id}>

        <TableRow
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(
              "text/plain",
              category.id
            );

            setDragId(category.id);
          }}

          onDragEnd={() => {
            setDragId(null);
            setDragOverId(null);
          }}

          onDragOver={(event) => {
            event.preventDefault();

            /*
             * Prevent dropping a parent
             * inside one of its descendants.
             */
            if (
              isDescendant(
                category.id,
                dragId ?? ""
              )
            ) {
              return;
            }

            setDragOverId(category.id);
          }}

          onDragLeave={() => {
            setDragOverId((current) =>
              current === category.id
                ? null
                : current
            );
          }}

          onDrop={async (event) => {
            event.preventDefault();

            const dragged =
              event.dataTransfer.getData(
                "text/plain"
              ) || dragId;

            if (
              !dragged ||
              dragged === category.id
            ) {
              return;
            }

            /*
             * Prevent circular hierarchy
             */
            if (
              isDescendant(
                category.id,
                dragged
              )
            ) {
              toast.error(
                "Impossible de déplacer une catégorie dans sa propre descendance."
              );

              setDragId(null);
              setDragOverId(null);

              return;
            }

            try {
              setLoading(true);

              /*
               * Make dragged category
               * a child of target category.
               */
              const { error } =
                await supabase
                  .from("categories")
                  .update({
                    parent_id:
                      category.id,
                  })
                  .eq("id", dragged);

              if (error) throw error;

              /*
               * Refresh complete tree
               */
              const { data, error: reloadError } =
                await supabase
                  .from("categories")
                  .select("*")
                  .order("updated_at", { ascending: false, nullsFirst: false });

              if (reloadError) {
                throw reloadError;
              }

              setList(
                (data ?? []).map(
                  normalizeCategory
                )
              );

              /*
               * Automatically expand target
               */
              setExpandedMap((current) => ({
                ...current,
                [category.id]: true,
              }));

              toast.success(
                "Catégorie déplacée."
              );

            } catch (err) {
              console.error(
                "drop move error:",
                err
              );

              toast.error(
                "Impossible de déplacer la catégorie."
              );

            } finally {
              setLoading(false);
              setDragId(null);
              setDragOverId(null);
            }
          }}

          className={
            dragOverId === category.id
              ? "bg-accent/5"
              : undefined
          }
        >

          {/* CHECKBOX */}

          <TableCell className="px-2">
            <Checkbox
              checked={selectedCategoryIds.includes(
                category.id
              )}

              onCheckedChange={(checked) =>
                toggleCategorySelection(
                  category.id,
                  checked === true
                )
              }

              aria-label={`Sélectionner la catégorie ${category.name}`}

              disabled={loading}
            />
          </TableCell>


          {/* NAME */}

         <TableCell className="px-2 font-medium">
  <div
    className="flex items-center"
    style={{
      paddingLeft: `${level * 40}px`,
    }}
  >
    {/* Ligne verticale de hiérarchie */}
    {level > 0 && (
  <div className=" flex items-center">
    <span className="h-px w-5 bg-white-400" />
  </div>
  )}

    {/* Avatar */}
    <Avatar className="h-10 w-10 shrink-0 rounded-md">
      {category.image_url && (
        <AvatarImage
          src={category.image_url}
          alt={category.name}
            className="h-full w-full object-cover"
        />
      )}

      <AvatarFallback className="rounded-md">
        {category.name
          .slice(0, 1)
          .toUpperCase()}
      </AvatarFallback>
    </Avatar>

    {/* Expand / collapse */}
    {children.length > 0 ? (
      <button
        type="button"
        className="ml-2 rounded p-1 hover:bg-muted"
        onClick={() =>
          toggleExpanded(category.id)
        }
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
    ) : (
      <span className="ml-2 w-6" />
    )}

    {/* Nom */}
    <span
      className={
        level === 0
          ? "ml-2 font-semibold"
          : level === 1
          ? "ml-2 font-medium"
          : "ml-2 text-sm"
      }
    >
      {category.name}
    </span>
  </div>
</TableCell>


          {/* DESCRIPTION */}

          <TableCell className="max-w-xs truncate px-2 text-muted-foreground">
            {category.description || "pas de description"}
          </TableCell>

          {/* SUBCATEGORIES COUNT */}

          <TableCell className="px-2 text-center">
            {category.subcategories_count ?? 0}
          </TableCell>


        

          {/* ACTIONS */}

          <TableCell className="px-2 text-right">

            <div className="flex items-center justify-end gap-2">

            


            <Button
              size="sm"
              variant="outline"
              aria-label="Voir"
              className="text-foreground"
              onClick={() =>
                setViewCategory(category)
              }
            >
              <Eye className="h-4 w-4" />
            </Button>
<Button
              size="sm"
              variant="ghost"
              aria-label="Modifier"
              className="text-foreground"
              onClick={() => {
                setDraft(category);
                setFile(null);
                setImgError(null);
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              aria-label="Supprimer"
              onClick={() =>
                setConfirmDeleteId(
                  category.id
                )
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            </div>

          </TableCell>

        </TableRow>


        {/* CHILDREN */}

        {isExpanded &&
          children.map((child) =>
            renderRow(
              child,
              level + 1,
              nextPath
            )
          )}

      </Fragment>
    );
  };


  /* =========================================================
     DROP TO ROOT
     
     parent_id = NULL
  ========================================================= */

  const onDropToRoot = async (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const dragged =
      event.dataTransfer.getData(
        "text/plain"
      ) || dragId;

    if (!dragged) return;

    try {
      setLoading(true);

      const { error } =
        await supabase
          .from("categories")
          .update({
            parent_id: dragged,
          })
          .eq("id", dragged);

      if (error) throw error;


      const { data, error: reloadError } =
        await supabase
          .from("categories")
          .select("*")
          .order("updated_at", { ascending: false, nullsFirst: false });

      if (reloadError) {
        throw reloadError;
      }

      setList(
        (data ?? []).map(
          normalizeCategory
        )
      );

      toast.success(
        "Catégorie déplacée au niveau principal."
      );

    } catch (err) {
      console.error(
        "drop to root error:",
        err
      );

      toast.error(
        "Impossible de déplacer la catégorie."
      );

    } finally {
      setLoading(false);
      setDragId(null);
      setDragOverId(null);
    }
  };


  /* =========================================================
     IMAGE VALIDATION
  ========================================================= */

  const validateAndSetFile = (
    selectedFile: File | null
  ) => {
    setImgError(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      !selectedFile.type.startsWith("image/")
    ) {
      setImgError(
        "Le fichier doit être une image."
      );

      return;
    }

    if (
      selectedFile.size >
      MAX_IMAGE_MB * 1024 * 1024
    ) {
      setImgError(
        `L'image ne doit pas dépasser ${MAX_IMAGE_MB} Mo.`
      );

      return;
    }

    setFile(selectedFile);
  };


  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setDragOver(false);

    const selectedFile =
      event.dataTransfer.files?.[0] ??
      null;

    validateAndSetFile(selectedFile);
  };


  /* =========================================================
     SAVE
  ========================================================= */

  const save = async () => {
    if (!draft.name.trim()) {
      setNameError("Le nom de la catégorie est obligatoire.");
      nameInputRef.current?.focus();

      return;
    }

    setNameError("");

    if (!profile) {
      toast.error(
        "Vous devez être connecté en tant qu'administrateur."
      );

      return;
    }

    /*
     * IMPORTANT:
     * A root category MUST have parent_id = null.
     */
    const categoryId = draft.id || randomUUID();
    const parentId = draft.parent_id || categoryId;

    const slug = slugify(draft.name);
    const updatedAt = new Date().toISOString();

    setLoading(true);

    try {
      let imageUrl =
        draft.image_url ?? null;


      /* IMAGE */

      if (file) {
        const filename = `${Date.now()}-${sanitizeFileName(file.name)}`;

        const path =
          `categories/${filename}`;

        imageUrl =
          await uploadToBucket(
            "categories",
            path,
            file
          );
      }


      /* UPDATE */

      if (draft.id) {

        const { error } =
          await supabase
            .from("categories")
            .update({
              name: draft.name.trim(),
              slug,
              parent_id: parentId,
              description:
                draft.description || null,
              image_url:
                imageUrl,
            })
            .eq("id", draft.id);

        if (error) throw error;


        setList((previous) =>
          previous.map((category) =>
            category.id === draft.id
              ? {
                  ...category,
                  name: draft.name.trim(),
                  slug,
                  parent_id: parentId,
                  description:
                    draft.description || null,
                  image_url:
                    imageUrl,
                  updated_at: updatedAt,
                }
              : category
          )
        );


        toast.success(
          "Catégorie mise à jour."
        );

      }

      /* CREATE */

      else {

        const payload = {
          id: categoryId,
          name: draft.name.trim(),
          slug,
          parent_id: parentId,
          description:
            draft.description || null,
          image_url:
            imageUrl,
          updated_at: updatedAt,
        };


        const {
          data,
          error,
        } = await supabase
          .from("categories")
          .insert(payload)
          .select()
          .maybeSingle();

        if (error) throw error;


        if (data) {
          setList((previous) => [
            ...previous,
            normalizeCategory(data),
          ]);
        }


        toast.success(
          "Catégorie créée."
        );
      }


      setOpen(false);
      setFile(null);
      setImgError(null);

    } catch (err: any) {

      console.error(
        "save category error:",
        err
      );

      const message = String(err?.message ?? "");
      toast.error(
        message.toLowerCase().includes("invalid key")
          ? "Nom de fichier image invalide. Renommez l'image avec des lettres et chiffres uniquement."
          : "Impossible d'enregistrer la catégorie."
      );

    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     REMOVE IMAGE
  ========================================================= */

  const removeImage = async () => {

    if (!draft.image_url) {
      setFile(null);

      setDraft({
        ...draft,
        image_url: null,
      });

      return;
    }


    if (!profile) {
      toast.error(
        "Action non autorisée."
      );

      return;
    }


    setLoading(true);

    try {

      const match =
        draft.image_url.match(
          /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/
        );


      if (match) {
        const bucket = match[1]!;
        const path =
          decodeURIComponent(match[2]!);

        await deleteFromBucket(
          bucket,
          path
        );
      }


      if (draft.id) {

        const { error } =
          await supabase
            .from("categories")
            .update({
              image_url: null,
            })
            .eq("id", draft.id);

        if (error) throw error;
      }


      setDraft({
        ...draft,
        image_url: null,
      });

      setFile(null);

      toast.success(
        "Image supprimée."
      );

    } catch (err) {

      console.error(
        "remove image error:",
        err
      );

      toast.error(
        "Impossible de supprimer l'image."
      );

    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     DELETE ONE CATEGORY
  ========================================================= */

  const deleteCategory = async () => {

    const id = confirmDeleteId;

    if (!id) return;

    try {

      setLoading(true);


      /*
       * Get image before deleting category.
       */
      const {
        data: categoryData,
        error: categoryError,
      } = await supabase
        .from("categories")
        .select("image_url")
        .eq("id", id)
        .maybeSingle();

      if (categoryError) {
        throw categoryError;
      }


      const imageUrl =
        categoryData?.image_url;


      /* DELETE IMAGE */

      if (imageUrl) {

        const match =
          imageUrl.match(
            /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/
          );

        if (match) {

          const bucket = match[1]!;
          const path =
            decodeURIComponent(
              match[2]!
            );

          try {
            await deleteFromBucket(
              bucket,
              path
            );
          } catch (imageError) {
            console.warn(
              "failed to delete category image",
              imageError
            );
          }
        }
      }


      /*
       * IMPORTANT:
       * PostgreSQL ON DELETE CASCADE
       * removes children automatically.
       */
      const { error } =
        await supabase
          .from("categories")
          .delete()
          .eq("id", id);

      if (error) throw error;


      /*
       * Reload tree because children
       * may also have been deleted.
       */
      const { data, error: reloadError } =
        await supabase
          .from("categories")
          .select("*")
          .order("updated_at", { ascending: false, nullsFirst: false });

      if (reloadError) {
        throw reloadError;
      }


      setList(
        (data ?? []).map(
          normalizeCategory
        )
      );


      toast.success(
        "Catégorie supprimée."
      );

    } catch (err) {

      console.error(
        "delete category error:",
        err
      );

      toast.error(
        "Impossible de supprimer la catégorie."
      );

    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
  };


  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="space-y-4">

      {/* HEADER */}

      <div className="space-y-3">

        <div>
          <h1 className="text-2xl font-bold">
            Catégories
          </h1>

          <p className="text-sm text-muted-foreground">
            {list.length} catégorie
            {list.length > 1 ? "s" : ""} ·
            organisation hiérarchique sur
            plusieurs niveaux.
          </p>
        </div>


        {/* SEARCH + ADD */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex flex-wrap items-center gap-2">

            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher une catégorie…"
              className="w-full sm:w-72"
            />

          </div>


          <Button
            variant="accent"
            onClick={() => {
              setDraft({
                ...empty,
                parent_id: null,
              });

              setFile(null);
              setImgError(null);
              setOpen(true);
            }}
            className="ml-auto"
          >
            <Plus className="h-4 w-4" />
            Nouvelle catégorie
          </Button>

        </div>


        {/* BULK DELETE */}

        {selectedCategoryIds.length > 0 && (
          <div className="mt-3 mb-3">

            <Button
              variant="destructive"
              onClick={() =>
                setConfirmDeleteIds(
                  selectedCategoryIds
                )
              }
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />

              Supprimer (
              {selectedCategoryIds.length}
              )

            </Button>

          </div>
        )}

      </div>


      {/* DROP TO ROOT */}

      <div
        className={`mb-3 rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground ${
          dragId
            ? "bg-accent/5 border-accent"
            : ""
        }`}

        onDragOver={(event) =>
          event.preventDefault()
        }

        onDrop={onDropToRoot}
      >
        Glisser-déposer ici pour déplacer
        vers le niveau principal
      </div>


      {/* TABLE */}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">

        <Table>

          <TableHeader>

            <TableRow>

              <TableHead className="w-12 px-2">
                <Checkbox
                  checked={
                    allVisibleSelected
                  }
                  onCheckedChange={(
                    checked
                  ) =>
                    toggleAllVisibleCategories(
                      checked === true
                    )
                  }
                  aria-label="Sélectionner toutes les catégories visibles"
                  disabled={
                    loading ||
                    filtered.length === 0
                  }
                />
              </TableHead>


              <TableHead className="px-2">
                Catégorie
              </TableHead>


              <TableHead className="px-2">
                Description
              </TableHead>

              <TableHead className="px-2 text-center">
                Sous-catégories
              </TableHead>


         

              <TableHead className="px-2 text-center">
                Actions
              </TableHead>

            </TableRow>

          </TableHeader>


          <TableBody>

            {loading ? (

              <TableRow>

                <TableCell
                  colSpan={6}
                  className="py-14 text-center text-muted-foreground"
                >
                  <Spinner
                    className="mx-auto h-6 w-6"
                    label="Chargement des catégories..."
                    showLabel
                  />
                </TableCell>

              </TableRow>

            ) : filtered.length === 0 ? (

              <TableRow>

                <TableCell
                  colSpan={6}
                  className="py-14 text-center text-muted-foreground"
                >
                  Aucune catégorie ne
                  correspond à cette
                  recherche.
                </TableCell>

              </TableRow>

            ) : (

              paginatedRoots.map((category) =>
                renderRow(category)
              )

            )}

          </TableBody>

        </Table>

      </div>

      {displayRoots.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground">
            {pageStart}–{pageEnd} sur {displayRoots.length}
          </span>
          <Pagination className="mx-0 w-auto justify-end text-foreground">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === page}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}


      {/* =====================================================
          BULK DELETE DIALOG
      ===================================================== */}

      <Dialog
        open={
          confirmDeleteIds.length > 0
        }
        onOpenChange={(open) => {
          if (
            !open &&
            !isBulkDeleting
          ) {
            setConfirmDeleteIds([]);
          }
        }}
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              Supprimer les catégories
              sélectionnées ?
            </DialogTitle>

          </DialogHeader>


          <p>
            Voulez-vous vraiment supprimer{" "}
            {confirmDeleteIds.length}{" "}
            catégorie
            {confirmDeleteIds.length > 1
              ? "s"
              : ""}
            ? Les sous-catégories
            seront également supprimées.
          </p>


          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setConfirmDeleteIds([])
              }
              disabled={
                isBulkDeleting
              }
            >
              Annuler
            </Button>


            <Button
              variant="destructive"
              onClick={
                deleteSelectedCategories
              }
              disabled={
                isBulkDeleting
              }
            >
              {isBulkDeleting ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </>
              )}
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>


      {/* =====================================================
          VIEW CATEGORY
      ===================================================== */}

      <Dialog
        open={Boolean(viewCategory)}
        onOpenChange={(value) => {
          if (!value) {
            setViewCategory(null);
          }
        }}
      >

        <DialogContent>

          <div className="flex justify-center">
            {viewCategory?.image_url ? (
              <Avatar className="h-28 w-28 rounded-lg">
                <AvatarImage
                  src={viewCategory.image_url}
                  alt={viewCategory.name}
                  className="h-full w-full object-cover"
                />
                <AvatarFallback className="rounded-lg text-2xl">
                  {viewCategory.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-28 w-28 rounded-lg">
                <AvatarFallback className="rounded-lg text-2xl">
                  {viewCategory?.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <DialogHeader>

            <DialogTitle className="text-center font-bold">
              {viewCategory
                ? viewCategory.name
                : ""}
            </DialogTitle>

          </DialogHeader>


          <div className="space-y-4">

            <p className="text-sm text-muted-foreground">
              {viewCategory?.description ||
                "Aucune description."}
            </p>

            <dl className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Sous-catégories</dt>
                <dd className="font-medium">
                  {viewCategory?.subcategories_count ?? 0}
                </dd>
              </div>

              <div>
                <dt className="text-muted-foreground">Dernière mise à jour</dt>
                <dd className="font-medium">
                  {viewCategory?.updated_at
                    ? new Date(viewCategory.updated_at).toLocaleString("fr-FR")
                    : "Non disponible"}
                </dd>
              </div>
            </dl>

            <div className="flex justify-end gap-2">

              <Button
                variant="outline"
                onClick={() =>
                  setViewCategory(null)
                }
              >
                Fermer
              </Button>


              <Button
                variant="accent"
                onClick={() => {

                  if (!viewCategory) {
                    return;
                  }

                  setDraft(
                    viewCategory
                  );

                  setOpen(true);
                  setViewCategory(
                    null
                  );

                }}
              >
                Éditer
              </Button>

            </div>

          </div>

        </DialogContent>

      </Dialog>


      {/* =====================================================
          DELETE CATEGORY
      ===================================================== */}

      <Dialog
        open={Boolean(
          confirmDeleteId
        )}
        onOpenChange={(value) => {
          if (!value) {
            setConfirmDeleteId(
              null
            );
          }
        }}
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              Confirmer la suppression
            </DialogTitle>

          </DialogHeader>


          <p>
            Voulez-vous vraiment
            supprimer cette catégorie ?
            Les sous-catégories et
            sous-sous-catégories seront
            également supprimées.
          </p>


          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setConfirmDeleteId(
                  null
                )
              }
            >
              Annuler
            </Button>


            <Button
              variant="accent"
              className="bg-destructive hover:bg-destructive/90"
              onClick={deleteCategory}
              disabled={loading}
            >
              {loading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                "Supprimer"
              )}
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>


      {/* =====================================================
          CREATE / EDIT DIALOG
      ===================================================== */}

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              {draft.id
                ? "Modifier la catégorie"
                : "Nouvelle catégorie"}
            </DialogTitle>

          </DialogHeader>


          <div className="grid gap-4 sm:grid-cols-2">

            {/* NAME */}

            <div className="space-y-2 sm:col-span-2">

              <Label>
                Nom
              </Label>

              <Input
                ref={nameInputRef}
                value={draft.name}
                aria-invalid={Boolean(nameError)}
                className={nameError ? "border-destructive focus-visible:ring-destructive" : undefined}
                onChange={(event) =>
                  {
                    setDraft({ ...draft, name: event.target.value });
                    if (event.target.value.trim()) setNameError("");
                  }
                }
              />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}

            </div>


            {/* PARENT */}

            <div className="space-y-2 sm:col-span-2">

              <Label>
                Catégorie parente
              </Label>


              <Popover open={parentMenuOpen} onOpenChange={setParentMenuOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    {draft.parent_id && draft.parent_id !== draft.id
                      ? parentOptions.find((category) => category.id === draft.parent_id)?.name
                        ?? list.find((category) => category.id === draft.parent_id)?.name
                        ?? "Catégorie sélectionnée"
                      : "Aucune — catégorie principale"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Input
                    autoFocus
                    value={parentSearch}
                    onChange={(event) => setParentSearch(event.target.value)}
                    placeholder="Rechercher une catégorie..."
                    className="rounded-none border-0 border-b focus-visible:ring-0"
                  />
                  <div className="max-h-64 overflow-y-auto p-1">
                    <button
                      type="button"
                      className="w-full rounded px-2 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setDraft({ ...draft, parent_id: null });
                        setParentSearch("");
                        setParentMenuOpen(false);
                      }}
                    >
                      Aucune — catégorie principale
                    </button>
                    {parentOptions
                      .filter((category) => category.id !== draft.id && !isDescendant(category.id, draft.id))
                      .map((category) => (
                        <button
                          type="button"
                          key={category.id}
                          className="w-full rounded px-2 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setDraft({ ...draft, parent_id: category.id });
                            setParentSearch("");
                            setParentMenuOpen(false);
                          }}
                        >
                          {category.parent_id && category.parent_id !== category.id ? "↳ " : ""}{category.name}
                        </button>
                      ))}
                    {parentOptions.length === 0 && (
                      <p className="px-2 py-3 text-sm text-muted-foreground">Aucune catégorie trouvée.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

            </div>


            {/* DESCRIPTION */}

            <div className="space-y-2 sm:col-span-2">

              <Label>
                Description
              </Label>

              <Input
                value={
                  draft.description ??
                  ""
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    description:
                      event.target.value,
                  })
                }
              />

            </div>


            {/* IMAGE */}

            <div className="space-y-2 sm:col-span-2">

              <Label>
                Image (optionnelle)
              </Label>


              {!file &&
              !draft.image_url ? (

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}

                  onDragLeave={() =>
                    setDragOver(false)
                  }

                  onDrop={handleDrop}

                  onClick={() =>
                    document
                      .getElementById(
                        "category-image-input"
                      )
                      ?.click()
                  }

                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                    dragOver
                      ? "border-accent bg-accent/5"
                      : "border-border hover:bg-surface"
                  }`}
                >

                  <p className="text-sm font-medium">
                    Glissez-déposez une
                    image ici
                  </p>

                  <p className="text-xs text-muted-foreground">
                    ou cliquez pour
                    parcourir · JPG, PNG ·{" "}
                    {MAX_IMAGE_MB} Mo max
                  </p>


                  <input
                    id="category-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      validateAndSetFile(
                        event.target.files?.[0] ??
                          null
                      )
                    }
                  />

                </div>

              ) : (

                <div className="flex items-start gap-3">

                  <img
                    src={
                      file
                        ? URL.createObjectURL(
                            file
                          )
                        : draft.image_url ??
                          ""
                    }
                    alt="preview"
                    className="h-24 w-24 rounded object-cover"
                  />


                  <div className="flex flex-col items-start gap-2">

                    {file && (
                      <span className="text-xs text-muted-foreground">
                        Image en attente
                        d'envoi
                      </span>
                    )}


                    <button
                      type="button"
                      className="text-sm text-destructive"
                      onClick={
                        removeImage
                      }
                    >
                      Supprimer l'image
                    </button>


                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline"
                      onClick={() =>
                        document
                          .getElementById(
                            "category-image-input-replace"
                          )
                          ?.click()
                      }
                    >
                      Remplacer
                    </button>


                    <input
                      id="category-image-input-replace"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        validateAndSetFile(
                          event.target.files?.[0] ??
                            null
                        )
                      }
                    />

                  </div>

                </div>

              )}


              {imgError && (
                <p className="text-xs text-destructive">
                  {imgError}
                </p>
              )}

            </div>


          </div>


          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setOpen(false)
              }
            >
              Annuler
            </Button>


            <Button
              variant="accent"
              onClick={save}
              disabled={loading}
            >
              {loading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                "Enregistrer"
              )}
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>
  );
}