import { useRef } from "react";
import { Bold, Heading2, Italic, List, Pilcrow } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BULLET_PREFIX, HEADING_PREFIX, RichText } from "@/components/ui/rich-text";

/**
 * Description produit avec une barre de mise en forme minimale.
 *
 * Le texte reste brut en base : la notation (**gras**, *italique*, ## titre,
 * • puce) est interprétée à l'affichage par <RichText />. L'aperçu sous le
 * champ montre exactement ce que verra le client.
 */
export function DescriptionEditor({
  id,
  value,
  onChange,
  rows = 7,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Le curseur doit rester sur le texte transformé, sinon il repart au début
  // du champ à chaque clic et la mise en forme devient pénible.
  const apply = (next: string, selectionStart: number, selectionEnd: number) => {
    onChange(next);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  /** Bornes des lignes entières touchées par la sélection (ou par le curseur). */
  const selectedLines = () => {
    const el = ref.current;
    if (!el) return null;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const nextBreak = value.indexOf("\n", el.selectionEnd);
    return { start, end: nextBreak === -1 ? value.length : nextBreak };
  };

  const replaceBlock = (start: number, end: number, block: string) =>
    apply(value.slice(0, start) + block + value.slice(end), start, start + block.length);

  /** Entoure la sélection des marqueurs, ou les retire si déjà présents. */
  const wrap = (marker: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;

    if (selectionStart === selectionEnd) {
      // Rien de sélectionné : on pose les marqueurs et on place le curseur entre.
      const caret = selectionStart + marker.length;
      apply(value.slice(0, selectionStart) + marker + marker + value.slice(selectionEnd), caret, caret);
      return;
    }

    const selected = value.slice(selectionStart, selectionEnd);
    // Pour l'italique, `**gras**` commence aussi par `*` : on ne le déferre pas.
    const isDoubled = marker === "*" && selected.startsWith("**") && selected.endsWith("**");
    const wrapped =
      !isDoubled &&
      selected.startsWith(marker) &&
      selected.endsWith(marker) &&
      selected.length > marker.length * 2;
    const next = wrapped
      ? selected.slice(marker.length, -marker.length)
      : `${marker}${selected}${marker}`;
    apply(
      value.slice(0, selectionStart) + next + value.slice(selectionEnd),
      selectionStart,
      selectionStart + next.length,
    );
  };

  /** Bascule un préfixe de ligne (titre ou puce) ; les deux s'excluent. */
  const togglePrefix = (prefix: string, other: string) => {
    const range = selectedLines();
    if (!range) return;
    const marker = prefix.trim();
    const otherMarker = other.trim();
    const lines = value.slice(range.start, range.end).split("\n");
    const filled = lines.filter((l) => l.trim() !== "");
    if (filled.length === 0) return;

    // Retire le préfixe courant comme celui de l'autre mode : une ligne ne peut
    // pas être à la fois un titre et une puce.
    const strip = (line: string) => {
      let out = line.trimStart();
      for (const candidate of [marker, otherMarker]) {
        if (out.startsWith(candidate)) {
          out = out.slice(candidate.length).trimStart();
          break;
        }
      }
      return out;
    };

    const allPrefixed = filled.every((l) => l.trimStart().startsWith(marker));
    const next = lines
      .map((line) => (line.trim() === "" ? line : allPrefixed ? strip(line) : `${prefix}${strip(line)}`))
      .join("\n");
    replaceBlock(range.start, range.end, next);
  };

  /** Coupe au curseur en insérant une ligne vide entre les deux paragraphes. */
  const insertParagraph = () => {
    const el = ref.current;
    if (!el) return;
    const before = value.slice(0, el.selectionStart).replace(/\s+$/, "");
    const after = value.slice(el.selectionEnd).replace(/^\s+/, "");
    const caret = before.length + 2;
    apply(`${before}\n\n${after}`, caret, caret);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Button type="button" variant="outline" size="sm" onClick={() => wrap("**")} title="Gras">
          <Bold className="h-4 w-4" /> Gras
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => wrap("*")} title="Italique">
          <Italic className="h-4 w-4" /> Italique
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => togglePrefix(HEADING_PREFIX, BULLET_PREFIX)}
          title="Intertitre, en plus grand"
        >
          <Heading2 className="h-4 w-4" /> Grand titre
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => togglePrefix(BULLET_PREFIX, HEADING_PREFIX)}
          title="Une puce par paragraphe"
        >
          <List className="h-4 w-4" /> Puce
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={insertParagraph} title="Nouveau paragraphe">
          <Pilcrow className="h-4 w-4" /> Paragraphe
        </Button>
      </div>

      <Textarea
        id={id}
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />

      {value.trim() !== "" && (
        <div className="rounded-md border border-border bg-surface/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Aperçu client
          </p>
          <RichText value={value} className="text-sm text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
