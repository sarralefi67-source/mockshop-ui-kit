/**
 * Génère une image produit mock (data-URI SVG) — évite toute dépendance réseau.
 * Sera remplacé par les URLs du storage lors du branchement de la vraie base.
 */
export function mockImage(label: string, hex = "#e7e5e4", variant = ""): string {
  const tint = hex;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${tint}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="#f7f7f6"/>
  <circle cx="400" cy="360" r="230" fill="url(#g)"/>
  <rect x="250" y="250" width="300" height="220" rx="28" fill="${tint}" opacity="0.85"/>
  <rect x="290" y="300" width="220" height="18" rx="9" fill="#ffffff" opacity="0.65"/>
  <rect x="290" y="336" width="150" height="18" rx="9" fill="#ffffff" opacity="0.45"/>
  <text x="400" y="640" font-family="system-ui,sans-serif" font-size="34" font-weight="700" fill="#3f3f46" text-anchor="middle">${escapeXml(label)}</text>
  <text x="400" y="686" font-family="system-ui,sans-serif" font-size="26" fill="#71717a" text-anchor="middle">${escapeXml(variant)}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

export function formatPrice(value: number): string {
  return `${value.toFixed(3).replace(".", ",")} DT`;
}
