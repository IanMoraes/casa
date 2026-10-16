"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatBRL } from "@/lib/money";

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 2 });
const axisMoney = (v: number) => (v === 0 ? "0" : compact.format(v));

// Saldo parado ou quase parado ainda precisa de uma escala legível.
function paddedDomain([min, max]: readonly number[]): [number, number] {
  const pad = Math.max((max - min) * 0.15, Math.abs(max) * 0.05, 50);
  return [Math.floor((min - pad) / 10) * 10, Math.ceil((max + pad) / 10) * 10];
}

function moneyFormatter(value: unknown, name: unknown, item: { color?: string; payload?: unknown }, config: ChartConfig) {
  const key = String(name);
  return (
    <div className="flex w-full items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} aria-hidden />
      <span className="text-muted-foreground">{config[key]?.label ?? key}</span>
      <span className="tabular ml-auto font-medium text-foreground">{formatBRL(Number(value))}</span>
    </div>
  );
}

// Entradas × saídas por mês. Cores validadas para daltonismo (verde × azul).
const flowConfig = {
  income: { label: "Entradas", color: "var(--chart-3)" },
  expense: { label: "Saídas", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function IncomeExpenseChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  return (
    <ChartContainer config={flowConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} barGap={2} barCategoryGap="28%" accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={axisMoney} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.5 }}
          content={
            <ChartTooltipContent formatter={(value, name, item) => moneyFormatter(value, name, item, flowConfig)} />
          }
        />
        {/* Mesma ordem das barras: entradas, depois saídas. */}
        <ChartLegend content={<ChartLegendContent />} itemSorter={(item) => (item.dataKey === "income" ? 0 : 1)} />
        <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}

const balanceConfig = {
  balance: { label: "Saldo", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function BalanceChart({ data }: { data: { label: string; balance: number }[] }) {
  return (
    <ChartContainer config={balanceConfig} className="aspect-auto h-48 w-full">
      <AreaChart data={data} accessibilityLayer margin={{ top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={axisMoney}
          domain={paddedDomain}
          allowDecimals={false}
          tickCount={4}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value, name, item) => moneyFormatter(value, name, item, balanceConfig)}
            />
          }
        />
        <Area
          dataKey="balance"
          type="monotone"
          isAnimationActive={false}
          stroke="var(--color-balance)"
          strokeWidth={2}
          fill="var(--color-balance)"
          fillOpacity={0.08}
          dot={{ r: 3, strokeWidth: 2, fill: "var(--surface)" }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
