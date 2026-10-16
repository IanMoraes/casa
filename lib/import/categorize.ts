import type { CategoryKind } from "@/lib/database.types";

type CategoryLike = { id: string; kind: CategoryKind; keywords: string[] };

function simplify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Sugere a categoria pela primeira palavra-chave encontrada na descrição,
// preferindo a palavra mais longa (mais específica).
export function suggestCategory(
  description: string,
  amount: number,
  categories: CategoryLike[],
): string | null {
  const kind: CategoryKind = amount > 0 ? "entrada" : "saida";
  const text = simplify(description);
  let best: { id: string; length: number } | null = null;

  for (const category of categories) {
    if (category.kind !== kind) continue;
    for (const keyword of category.keywords) {
      const k = simplify(keyword.trim());
      if (k.length < 2) continue;
      // Palavras muito curtas ("99") só valem como palavra inteira.
      const hit = k.length <= 3 ? new RegExp(`(^|[^a-z0-9])${escape(k)}([^a-z0-9]|$)`).test(text) : text.includes(k);
      if (hit && (!best || k.length > best.length)) {
        best = { id: category.id, length: k.length };
      }
    }
  }
  return best?.id ?? null;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
