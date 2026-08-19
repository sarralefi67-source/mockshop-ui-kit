import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  dir: "asc" | "desc" | null;
  className?: string;
  ariaLabel?: string;
};

export default function SortArrow({ dir, className, ariaLabel }: Props) {
  const symbol =  dir === "asc" ? "▲" : "▼";
  return (
    <span className={cn("inline-block", className)} aria-label={ariaLabel ?? "Tri"}>
      {symbol}
    </span>
  );
}
