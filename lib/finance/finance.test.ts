import { describe, expect, it } from "vitest";

import { addMonths, dueDateIn, parseMonthParam } from "@/lib/dates";
import { parseAmount } from "@/lib/money";

import { billsForMonth, summarizeBills, type RecurringBillLike } from "./recurring";
import { balanceHistory, balanceOf, expensesByCategory, totals } from "./summary";

const bill = (over: Partial<RecurringBillLike & { amount: number }> & { id: string }) => ({
  due_day: 10,
  start_month: "2026-01-01",
  end_month: null,
  active: true,
  amount: 100,
  ...over,
});

describe("contas fixas", () => {
  const bills = [
    bill({ id: "aluguel", due_day: 5, amount: 1500 }),
    bill({ id: "luz", due_day: 20, amount: 200 }),
    bill({ id: "academia", due_day: 31, start_month: "2026-11-01" }),
    bill({ id: "curso", end_month: "2026-09-01" }),
    bill({ id: "cancelada", active: false }),
  ];

  it("projeta só as contas válidas no mês, em ordem de vencimento", () => {
    const list = billsForMonth(bills, [], "2026-10-01", "2026-10-01");
    expect(list.map((o) => o.bill.id)).toEqual(["aluguel", "luz"]);
  });

  it("respeita mês de início e de fim", () => {
    expect(billsForMonth(bills, [], "2026-11-01", "2026-11-01").map((o) => o.bill.id)).toContain("academia");
    expect(billsForMonth(bills, [], "2026-09-01", "2026-09-01").map((o) => o.bill.id)).toContain("curso");
  });

  it("dia 31 vira o último dia em meses curtos", () => {
    expect(dueDateIn("2027-02-01", 31)).toBe("2027-02-28");
    expect(dueDateIn("2028-02-01", 31)).toBe("2028-02-29");
  });

  it("classifica paga, atrasada, vence logo e prevista", () => {
    const payments = [
      { id: "p1", recurring_bill_id: "aluguel", reference_month: "2026-10-01", amount: -1500, occurred_on: "2026-10-04" },
    ];
    const list = billsForMonth(
      [...bills, bill({ id: "agua", due_day: 15 }), bill({ id: "net", due_day: 12 })],
      payments,
      "2026-10-01",
      "2026-10-11",
    );
    const status = Object.fromEntries(list.map((o) => [o.bill.id, o.status]));
    expect(status).toEqual({ aluguel: "paga", net: "vence-logo", agua: "prevista", luz: "prevista" });

    const late = billsForMonth(bills, [], "2026-10-01", "2026-10-06");
    expect(late.find((o) => o.bill.id === "aluguel")?.status).toBe("atrasada");
  });

  it("pagamento de outro mês não conta", () => {
    const payments = [
      { id: "p1", recurring_bill_id: "aluguel", reference_month: "2026-09-01", amount: -1500, occurred_on: "2026-10-01" },
    ];
    const list = billsForMonth(bills, payments, "2026-10-01", "2026-10-01");
    expect(list.find((o) => o.bill.id === "aluguel")?.status).not.toBe("paga");
  });

  it("conta desativada continua aparecendo no mês em que foi paga", () => {
    const payments = [
      { id: "p1", recurring_bill_id: "cancelada", reference_month: "2026-10-01", amount: -100, occurred_on: "2026-10-10" },
    ];
    const list = billsForMonth(bills, payments, "2026-10-01", "2026-10-15");
    expect(list.find((o) => o.bill.id === "cancelada")?.status).toBe("paga");
  });

  it("resume pagas e o valor que falta", () => {
    const payments = [
      { id: "p1", recurring_bill_id: "aluguel", reference_month: "2026-10-01", amount: -1500, occurred_on: "2026-10-04" },
    ];
    const summary = summarizeBills(billsForMonth(bills, payments, "2026-10-01", "2026-10-11"));
    expect(summary).toEqual({ total: 2, paid: 1, pending: 1, pendingAmount: 200 });
  });
});

describe("saldos e totais", () => {
  const txs = [
    { account_id: "a", kind: "entrada" as const, amount: 3000, occurred_on: "2026-09-05", category_id: "salario" },
    { account_id: "a", kind: "saida" as const, amount: -800.1, occurred_on: "2026-09-10", category_id: "mercado" },
    { account_id: "a", kind: "transferencia" as const, amount: -500, occurred_on: "2026-10-01", category_id: null },
    { account_id: "b", kind: "transferencia" as const, amount: 500, occurred_on: "2026-10-01", category_id: null },
    { account_id: "a", kind: "ajuste" as const, amount: -12.3, occurred_on: "2026-10-02", category_id: null },
    { account_id: "a", kind: "saida" as const, amount: -199.9, occurred_on: "2026-10-03", category_id: "mercado" },
  ];

  it("saldo inclui transferências e ajustes", () => {
    expect(balanceOf(100, txs.filter((t) => t.account_id === "a"))).toBe(1587.7);
    expect(balanceOf(0, txs.filter((t) => t.account_id === "b"))).toBe(500);
  });

  it("transferências e ajustes não contam como ganho nem gasto", () => {
    expect(totals(txs)).toEqual({ income: 3000, expense: 1000, net: 2000 });
  });

  it("agrupa gastos por categoria", () => {
    expect(expensesByCategory(txs)).toEqual([{ categoryId: "mercado", amount: 1000 }]);
  });

  it("evolução do saldo mês a mês", () => {
    expect(balanceHistory(100, txs, ["2026-09-01", "2026-10-01"])).toEqual([
      { month: "2026-09-01", balance: 2299.9 },
      { month: "2026-10-01", balance: 2087.7 },
    ]);
  });
});

describe("utilitários", () => {
  it("lê valores em vários formatos", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("-150,00")).toBe(-150);
    expect(parseAmount("R$ 10")).toBe(10);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount("abc")).toBeNull();
  });

  it("navega entre meses e lê o mês da URL", () => {
    expect(addMonths("2026-12-01", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
    expect(parseMonthParam("2026-03")).toBe("2026-03-01");
    expect(parseMonthParam("2026-13")).toMatch(/^\d{4}-\d{2}-01$/);
  });
});
