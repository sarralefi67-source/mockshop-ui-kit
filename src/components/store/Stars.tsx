import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`Note ${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            cls,
            i <= Math.round(value)
              ? "fill-warning text-warning"
              : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}
