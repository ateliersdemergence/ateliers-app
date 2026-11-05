// Prix saisi dans un formulaire -> nombre >= 0 avec 2 décimales max, ou null si vide / invalide.
// Pas de valeur par défaut : un champ vide n'est jamais transformé en 0 (gratuit).
export function parsePrice(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}
