import { describe, expect, it } from "vitest";

import { positionAt, positionAtEnd, positionBetween } from "./position";

describe("posição de lanes e tarefas", () => {
  it("fica entre os vizinhos", () => {
    expect(positionBetween(1, 2)).toBe(1.5);
    expect(positionBetween(undefined, 10)).toBe(10 - 1024);
    expect(positionBetween(10, undefined)).toBe(10 + 1024);
    expect(positionBetween(undefined, undefined)).toBe(1024);
  });

  it("calcula a posição de um item já reordenado", () => {
    const items = [{ position: 1 }, { position: 999 }, { position: 2 }];
    expect(positionAt(items, 1)).toBe(1.5);
    expect(positionAt(items, 0)).toBe(999 - 1024);
    expect(positionAtEnd(items)).toBe(2 + 1024);
  });

  it("aguenta muitas inserções no mesmo lugar sem empatar", () => {
    let lo = 1;
    const hi = 2;
    for (let i = 0; i < 40; i++) lo = positionBetween(lo, hi);
    expect(lo).toBeLessThan(hi);
  });
});
