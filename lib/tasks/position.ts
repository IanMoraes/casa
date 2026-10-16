// Posição decimal: mover um item grava só a média entre os vizinhos.

export const POSITION_STEP = 1024;

export function positionBetween(prev: number | undefined, next: number | undefined) {
  if (prev === undefined && next === undefined) return POSITION_STEP;
  if (prev === undefined) return next! - POSITION_STEP;
  if (next === undefined) return prev + POSITION_STEP;
  return (prev + next) / 2;
}

// Posição para o item que está no índice `index` de `items` (já reordenado).
export function positionAt<T extends { position: number }>(items: T[], index: number) {
  return positionBetween(items[index - 1]?.position, items[index + 1]?.position);
}

export function positionAtEnd<T extends { position: number }>(items: T[]) {
  return positionBetween(items.at(-1)?.position, undefined);
}
