import React from "react";

type SpinnerProps = {
  className?: string;
  label?: string | null;
  showLabel?: boolean;
};

export function Spinner({ className = "h-4 w-4", label = "Chargement...", showLabel = false }: SpinnerProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${showLabel ? "" : ""}`}>
      <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      {showLabel && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

export default Spinner;
