// "MAR 2026" -> "Mar"; "Mar" stays "Mar"
export function shortMonth(label: string) {
  const first = label.trim().split(/\s+/)[0] ?? label;
  return first.charAt(0).toUpperCase() + first.slice(1, 3).toLowerCase();
}

// "MAR 2026" -> "Mar 2026"
export function fullMonth(label: string) {
  return label
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

// Round a raw step up to 1, 2, 2.5 or 5 x 10^n so axis ticks land on readable values
export function niceStep(rawStep: number) {
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}
