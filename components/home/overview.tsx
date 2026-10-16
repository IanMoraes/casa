"use client";

import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { BalanceChart, IncomeExpenseChart } from "./charts";
import { HomeCard } from "./cards";

type FlowPoint = { label: string; income: number; expense: number };
type BalancePoint = { label: string; balance: number };

const PERIODS = [
  { value: "3", label: "3M" },
  { value: "6", label: "6M" },
  { value: "12", label: "12M" },
];

function PeriodToggle({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      aria-label={label}
    >
      {PERIODS.map((p) => (
        <ToggleGroupItem key={p.value} value={p.value} className="px-2.5">
          {p.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// Visão geral: entradas e saídas, com escolha de período.
export function OverviewCard({ flow }: { flow: FlowPoint[] }) {
  const [period, setPeriod] = useState("6");
  return (
    <HomeCard title="Entradas e saídas" aside={<PeriodToggle value={period} onChange={setPeriod} label="Período de entradas e saídas" />}>
      <IncomeExpenseChart data={flow.slice(-Number(period))} />
    </HomeCard>
  );
}

export function BalanceCard({ history }: { history: BalancePoint[] }) {
  const [period, setPeriod] = useState("6");
  return (
    <HomeCard title="Evolução do saldo" aside={<PeriodToggle value={period} onChange={setPeriod} label="Período da evolução do saldo" />}>
      <BalanceChart data={history.slice(-Number(period))} />
    </HomeCard>
  );
}
