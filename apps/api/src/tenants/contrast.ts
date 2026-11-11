/** WCAG relative luminance of a "#RRGGBB" colour. */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Contrast guard: text colour to put on the clinic's brand colour.
 * White if it reaches WCAG AA (4.5:1), otherwise dark ink, so a light brand colour never makes unreadable text.
 */
export function contrastTextFor(primary: string): '#FFFFFF' | '#0F172A' {
  return contrastRatio(primary, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#0F172A';
}
