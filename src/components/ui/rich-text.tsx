import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Rendu du texte enrichi saisi dans l'admin (DescriptionEditor).
 *
 * Le contenu reste stocké en texte brut avec une notation minimale, et n'est
 * jamais injecté en HTML : on construit des éléments React, donc aucun risque
 * d'injection depuis le back-office.
 *
 *   **gras**      -> <strong>
 *   *italique*    -> <em>
 *   ## Titre      -> intertitre (taille augmentée)
 *   • élément     -> puce
 *   ligne vide    -> nouveau paragraphe
 */

export const HEADING_PREFIX = "## ";
export const BULLET_PREFIX = "• ";

/** `**gras**` et `*italique*`. Les classes de caractères excluent `*` : pas
 *  d'imbrication, mais aucun risque de retour arrière catastrophique. */
function renderInline(text: string): ReactNode {
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) nodes.push(<strong key={key++}>{match[1]}</strong>);
    else nodes.push(<em key={key++}>{match[2]}</em>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length === 0 ? text : nodes;
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; lines: string[] };

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      // Une ligne vide ferme le bloc courant.
      if (blocks.length > 0 && blocks[blocks.length - 1]?.kind === "paragraph") {
        blocks.push({ kind: "paragraph", lines: [] });
      }
      continue;
    }
    if (line.startsWith(HEADING_PREFIX)) {
      blocks.push({ kind: "heading", text: line.slice(HEADING_PREFIX.length).trim() });
      continue;
    }
    if (line.trimStart().startsWith("•")) {
      const item = line.trimStart().replace(/^•\s?/, "");
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list") last.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.kind === "paragraph") last.lines.push(line);
    else blocks.push({ kind: "paragraph", lines: [line] });
  }
  return blocks.filter((b) => b.kind !== "paragraph" || b.lines.length > 0);
}

export function RichText({ value, className }: { value: string | null; className?: string }) {
  if (!value?.trim()) return null;
  const blocks = parseBlocks(value);

  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3 key={index} className="font-display text-lg font-semibold text-foreground">
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={index} className="list-inside list-disc space-y-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
