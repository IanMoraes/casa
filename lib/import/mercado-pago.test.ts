import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { suggestCategory } from "./categorize";
import { parseMercadoPago } from "./mercado-pago";
import type { Sheet } from "./types";

const csv = readFileSync(
  fileURLToPath(new URL("./__fixtures__/mercado-pago-exemplo.csv", import.meta.url)),
  "utf-8",
);
const csvLines = Papa.parse<string[]>(csv, { skipEmptyLines: false }).data;
const csvSheet: Sheet = csvLines;

// Mesmo extrato em XLSX, com valores numéricos e datas como serial do Excel,
// que é como o Excel do Mercado Pago chega.
function toXlsxSheet(): Sheet {
  const rows = csvLines.map((line, i) => {
    if (i < 4 || line.length < 5) return line;
    const [d, desc, id, amount, balance] = line;
    const [day, month, year] = d.split("-").map(Number);
    const serial = (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000;
    const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
    return [serial, desc, id, num(amount), num(balance)];
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "Extrato");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
  const read = XLSX.read(buffer, { type: "array" });
  return XLSX.utils.sheet_to_json(read.Sheets[read.SheetNames[0]], { header: 1, raw: true, defval: null });
}

describe("parseMercadoPago", () => {
  for (const [label, sheet] of [
    ["CSV", csvSheet],
    ["XLSX", toXlsxSheet()],
  ] as const) {
    describe(label, () => {
      const parsed = parseMercadoPago(sheet);

      it("lê todas as linhas de lançamento", () => {
        expect(parsed.rows).toHaveLength(7);
        expect(parsed.skipped).toEqual([]);
      });

      it("converte data, valor com sinal e ID", () => {
        expect(parsed.rows[0]).toEqual({
          occurredOn: "2026-10-01",
          description: "Transferência Pix recebida EMPRESA EXEMPLO LTDA",
          amount: 3500,
          externalId: "mp:90000000001",
          balanceAfter: 4500,
        });
        expect(parsed.rows[1].amount).toBe(-212.4);
      });

      it("lê os saldos inicial e final do resumo", () => {
        expect(parsed.initialBalance).toBe(1000);
        expect(parsed.finalBalance).toBe(3137.6);
      });

      it("fecha a conta: saldo inicial + lançamentos = saldo final", () => {
        const total = parsed.rows.reduce((acc, r) => acc + r.amount, parsed.initialBalance ?? 0);
        expect(Math.round(total * 100) / 100).toBe(parsed.finalBalance);
      });
    });
  }

  it("aceita cabeçalhos em português", () => {
    const sheet: Sheet = [
      ["Data", "Descrição", "ID da operação", "Valor", "Saldo"],
      ["15/10/2026", "Pix enviado", "abc", "-10,50", "89,50"],
    ];
    const parsed = parseMercadoPago(sheet);
    expect(parsed.rows[0]).toMatchObject({ occurredOn: "2026-10-15", amount: -10.5, externalId: "mp:abc" });
  });

  it("gera IDs estáveis e distintos para linhas iguais sem ID", () => {
    const sheet: Sheet = [
      ["RELEASE_DATE", "TRANSACTION_TYPE", "TRANSACTION_NET_AMOUNT"],
      ["01-10-2026", "Café", "-5,00"],
      ["01-10-2026", "Café", "-5,00"],
    ];
    const first = parseMercadoPago(sheet).rows.map((r) => r.externalId);
    const second = parseMercadoPago(sheet).rows.map((r) => r.externalId);
    expect(new Set(first).size).toBe(2);
    expect(second).toEqual(first);
  });

  it("explica o erro quando o arquivo não é um extrato", () => {
    expect(() => parseMercadoPago([["nome", "idade"]])).toThrow(/colunas de data e valor/);
  });

  it("diferencia linhas com o mesmo ID de operação (pagamento e tarifa)", () => {
    const sheet: Sheet = [
      ["RELEASE_DATE", "TRANSACTION_TYPE", "REFERENCE_ID", "TRANSACTION_NET_AMOUNT"],
      ["01-10-2026", "Pagamento", "555", "100,00"],
      ["01-10-2026", "Tarifa", "555", "-4,99"],
      ["02-10-2026", "Outra", "556", "10,00"],
    ];
    const ids = parseMercadoPago(sheet).rows.map((r) => r.externalId);
    expect(ids).toEqual(["mp:555", "mp:555#2", "mp:556"]);
    expect(parseMercadoPago(sheet).rows.map((r) => r.externalId)).toEqual(ids);
  });

  it("aceita crédito e débito em colunas separadas e ignora linhas de resumo", () => {
    const sheet: Sheet = [
      ["DATE", "SOURCE_ID", "DESCRIPTION", "NET_CREDIT_AMOUNT", "NET_DEBIT_AMOUNT", "RECORD_TYPE"],
      ["2026-10-01T00:00:00.000-03:00", "", "", "1000", "0", "initial_available_balance"],
      ["2026-10-02T10:15:00.000-03:00", "9001", "payment", "250.5", "0", "release"],
      ["2026-10-03T08:00:00.000-03:00", "9002", "withdrawal", "0", "80", "release"],
      ["2026-10-31T23:59:59.000-03:00", "", "", "250.5", "80", "total"],
    ];
    const parsed = parseMercadoPago(sheet);
    expect(parsed.rows.map((r) => [r.occurredOn, r.amount, r.externalId])).toEqual([
      ["2026-10-02", 250.5, "mp:9001"],
      ["2026-10-03", -80, "mp:9002"],
    ]);
  });

  it("aceita arquivo sem coluna de descrição", () => {
    const sheet: Sheet = [
      ["Data", "Valor"],
      ["05/10/2026", "-12,30"],
    ];
    expect(parseMercadoPago(sheet).rows[0]).toMatchObject({ description: "Movimentação", amount: -12.3 });
  });

  it("separa linhas com data ou valor inválidos", () => {
    const sheet: Sheet = [
      ["RELEASE_DATE", "TRANSACTION_TYPE", "REFERENCE_ID", "TRANSACTION_NET_AMOUNT"],
      ["sem data", "x", "1", "10,00"],
      ["01-10-2026", "x", "2", "0,00"],
      ["01-10-2026", "ok", "3", "10,00"],
    ];
    const parsed = parseMercadoPago(sheet);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.skipped.map((s) => s.line)).toEqual([2, 3]);
  });
});

describe("suggestCategory", () => {
  const categories = [
    { id: "contas", kind: "saida" as const, keywords: ["enel", "luz"] },
    { id: "mercado", kind: "saida" as const, keywords: ["mercado", "supermercado"] },
    { id: "transporte", kind: "saida" as const, keywords: ["uber", "99"] },
    { id: "pix-in", kind: "entrada" as const, keywords: ["pix recebid"] },
  ];

  it("usa a palavra-chave mais específica", () => {
    expect(suggestCategory("Pagamento com QR Pix Supermercado Exemplo", -480, categories)).toBe("mercado");
    expect(suggestCategory("Pagamento de conta Enel", -212.4, categories)).toBe("contas");
  });

  it("respeita o sentido do valor", () => {
    expect(suggestCategory("Transferência Pix recebida", 100, categories)).toBe("pix-in");
    expect(suggestCategory("Transferência Pix recebida", -100, categories)).toBeNull();
  });

  it("palavras curtas só valem inteiras", () => {
    expect(suggestCategory("Corrida 99 Pop", -20, categories)).toBe("transporte");
    expect(suggestCategory("Pedido 1999", -20, categories)).toBeNull();
  });
});
