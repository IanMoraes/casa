import { describe, expect, it } from "vitest";

import { detectRecurring, findPossibleDuplicates, normalizeDescription, type ExistingTx } from "./analyze";

const line = (occurredOn: string, description: string, amount: number, categoryId: string | null = null) => ({
  occurredOn,
  description,
  amount,
  categoryId,
});

describe("normalizeDescription", () => {
  it("ignora números, acentos e palavras genéricas", () => {
    expect(normalizeDescription("Pagamento Enel 10/2026")).toBe("enel");
    expect(normalizeDescription("Pagamento de conta Enel")).toBe("conta enel");
    expect(normalizeDescription("Transferência Pix enviada FULANO DE TAL")).toBe("fulano tal");
  });

  it("não deixa a chave vazia quando só há palavras genéricas", () => {
    expect(normalizeDescription("Pix recebido").length).toBeGreaterThan(0);
  });
});

describe("repetidas parecidas", () => {
  const existing: ExistingTx[] = [
    { occurredOn: "2026-10-05", amount: -480, description: "Mercado (lançado à mão)", externalId: null, categoryId: null },
    { occurredOn: "2026-10-10", amount: -35, description: "Uber", externalId: "mp:1", categoryId: null },
  ];

  it("acha o mesmo valor no mesmo dia ou no dia vizinho", () => {
    const rows = [
      { ...line("2026-10-05", "Pagamento Supermercado Exemplo", -480), externalId: "mp:9" },
      { ...line("2026-10-11", "Pagamento Uber", -35), externalId: "mp:10" },
      { ...line("2026-10-20", "Outra coisa", -480), externalId: "mp:11" },
    ];
    const found = findPossibleDuplicates(rows, existing);
    expect([...found.keys()]).toEqual([0, 1]);
    expect(found.get(0)?.existingDescription).toBe("Mercado (lançado à mão)");
  });

  it("um lançamento existente casa com uma linha só", () => {
    const rows = [
      { ...line("2026-10-05", "Mercado A", -480), externalId: "mp:a" },
      { ...line("2026-10-05", "Mercado B", -480), externalId: "mp:b" },
    ];
    expect(findPossibleDuplicates(rows, existing).size).toBe(1);
  });

  it("valor diferente não é repetida", () => {
    const rows = [{ ...line("2026-10-05", "Mercado", -480.01), externalId: "mp:x" }];
    expect(findPossibleDuplicates(rows, existing).size).toBe(0);
  });
});

describe("gastos que se repetem todo mês", () => {
  const netflix = [
    line("2026-06-15", "Pagamento Netflix", -39.9),
    line("2026-07-15", "Pagamento Netflix", -39.9),
    line("2026-08-16", "Pagamento Netflix", -39.9),
    line("2026-09-15", "Pagamento Netflix", -44.9, "cat-lazer"),
  ];

  it("sugere conta fixa com valor, dia e mês de início", () => {
    const [s] = detectRecurring(netflix);
    expect(s).toMatchObject({
      description: "Pagamento Netflix",
      kind: "saida",
      dueDay: 15,
      months: 4,
      lastMonth: "2026-09-01",
      startMonth: "2026-10-01",
      categoryId: "cat-lazer",
    });
    expect(s.amount).toBeCloseTo(39.9, 2);
  });

  it("precisa de pelo menos 3 meses", () => {
    expect(detectRecurring(netflix.slice(0, 2))).toEqual([]);
  });

  it("várias vezes no mesmo mês (mercado, Uber) não é conta fixa", () => {
    const uber = ["06", "07", "08"].flatMap((m) => [
      line(`2026-${m}-02`, "Pagamento Uber", -20),
      line(`2026-${m}-09`, "Pagamento Uber", -21),
      line(`2026-${m}-16`, "Pagamento Uber", -19),
      line(`2026-${m}-23`, "Pagamento Uber", -22),
    ]);
    expect(detectRecurring(uber)).toEqual([]);
  });

  it("valor muito diferente a cada mês não é conta fixa", () => {
    const luz = [
      line("2026-06-10", "Pagamento Enel", -90),
      line("2026-07-10", "Pagamento Enel", -310),
      line("2026-08-10", "Pagamento Enel", -150),
    ];
    expect(detectRecurring(luz)).toEqual([]);
  });

  it("dia muito diferente a cada mês não é conta fixa", () => {
    const solto = [
      line("2026-06-02", "Pagamento Dentista", -100),
      line("2026-07-28", "Pagamento Dentista", -100),
      line("2026-08-14", "Pagamento Dentista", -100),
    ];
    expect(detectRecurring(solto)).toEqual([]);
  });

  it("meses muito espaçados não contam como todo mês", () => {
    const raro = [
      line("2025-01-10", "Pagamento Seguro", -200),
      line("2025-08-10", "Pagamento Seguro", -200),
      line("2026-03-10", "Pagamento Seguro", -200),
    ];
    expect(detectRecurring(raro)).toEqual([]);
  });

  it("não sugere o que já é conta fixa", () => {
    expect(detectRecurring(netflix, ["Netflix"])).toEqual([]);
  });

  it("separa entrada de saída e reconhece salário", () => {
    const salario = ["06", "07", "08"].map((m) => line(`2026-${m}-05`, "Transferência Pix recebida EMPRESA EXEMPLO", 3500));
    const [s] = detectRecurring(salario);
    expect(s).toMatchObject({ kind: "entrada", amount: 3500, dueDay: 5 });
  });
});
