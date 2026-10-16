import { describe, expect, it } from "vitest";

import { maskDay, maskInviteCode, maskMoney, moneyToMasked, toggleMoneySign } from "./masks";
import { parseAmount } from "./money";

describe("máscara de dinheiro", () => {
  it("preenche da direita para a esquerda, como em app de banco", () => {
    expect(maskMoney("1")).toBe("0,01");
    expect(maskMoney("12")).toBe("0,12");
    expect(maskMoney("123")).toBe("1,23");
    expect(maskMoney("123456")).toBe("1.234,56");
    expect(maskMoney("12345678")).toBe("123.456,78");
  });

  it("ignora letras, pontos e zeros à esquerda", () => {
    expect(maskMoney("R$ 1.234,56")).toBe("1.234,56");
    expect(maskMoney("0,005")).toBe("0,05");
    expect(maskMoney("abc")).toBe("");
    expect(maskMoney("")).toBe("");
  });

  it("apagar um número tira o último dígito", () => {
    // "1.234,56" apagando o último caractere vira "1.234,5"
    expect(maskMoney("1.234,5")).toBe("123,45");
  });

  it("sinal negativo só quando permitido", () => {
    expect(maskMoney("-150", false)).toBe("1,50");
    expect(maskMoney("-150", true)).toBe("-1,50");
    // digitar "-" de novo num valor negativo volta a positivo
    expect(maskMoney("-1,50-", true)).toBe("1,50");
    expect(toggleMoneySign("1,50")).toBe("-1,50");
    expect(toggleMoneySign("-1,50")).toBe("1,50");
  });

  it("formata valores iniciais", () => {
    expect(moneyToMasked(1234.5)).toBe("1.234,50");
    expect(moneyToMasked(-87.9, true)).toBe("-87,90");
    expect(moneyToMasked(-87.9, false)).toBe("87,90");
    expect(moneyToMasked(0)).toBe("0,00");
    expect(moneyToMasked(null)).toBe("");
  });

  it("o servidor lê de volta o que a máscara mostra", () => {
    for (const v of [0.01, 9.9, 1234.56, -500, 99999.99]) {
      expect(parseAmount(moneyToMasked(v, true))).toBe(v);
    }
  });
});

describe("outras máscaras", () => {
  it("código de convite", () => {
    expect(maskInviteCode("ab12-cd34 xyz")).toBe("AB12CD34");
  });

  it("dia do mês", () => {
    expect(maskDay("5")).toBe("5");
    expect(maskDay("05")).toBe("5");
    expect(maskDay("45")).toBe("31");
    expect(maskDay("dia 10")).toBe("10");
    expect(maskDay("0")).toBe("");
  });
});
