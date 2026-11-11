/**
 * WCAG contrast helpers (same maths as apps/api/src/tenants/contrast.ts, which sets primaryContrast for real tenants).
 * Used by the branding preview so clinic owners see the contrast guard working live.
 */
export const HEX_RE = /^#[0-9a-f]{6}$/i;

function luminance(hex: string): number {
  if (!HEX_RE.test(hex)) return 0;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export const INK = '#0F172A';
export const WHITE = '#FFFFFF';

/** White text if it reaches WCAG AA (4.5:1) on the brand colour, otherwise dark ink. */
export function contrastTextFor(primary: string): string {
  return contrastRatio(primary, WHITE) >= 4.5 ? WHITE : INK;
}
