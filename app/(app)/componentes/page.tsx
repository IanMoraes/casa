import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AzulejoMark } from "@/components/brand/azulejo";
import { BillTile, type BillOccurrenceView } from "@/components/finance/bill-wall";
import { Money } from "@/components/finance/money";
import { IconBubble } from "@/components/finance/category-badge";
import { CategoryBreakdown, MoneyMovement } from "@/components/home/cards";
import { categoryIcon } from "@/lib/categories";
import { BalanceChart, IncomeExpenseChart } from "@/components/home/charts";
import { PageHeader } from "@/components/shell/page-header";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { FormSamples } from "./form-samples";

export const metadata: Metadata = { title: "Componentes" };

const TOKENS = [
  { name: "Fundo", token: "--background", use: "Cinza-azulado claro" },
  { name: "Cartão", token: "--surface", use: "Cartões e listas" },
  { name: "Texto", token: "--foreground", use: "Texto principal" },
  { name: "Celeste", token: "--primary", use: "Ações e faixa do topo" },
  { name: "Verde", token: "--income", use: "Entrou dinheiro" },
  { name: "Âmbar", token: "--warning", use: "Vence logo" },
  { name: "Vermelho", token: "--destructive", use: "Atrasada, erro" },
  { name: "Laranja", token: "--chart-2", use: "Segunda pessoa" },
];

const bill = (id: string, description: string, amount: number, due_day: number) => ({
  id,
  description,
  kind: "saida" as const,
  amount,
  due_day,
  owner_id: "x",
  account_id: null,
  category_id: null,
  start_month: "2026-01-01",
  end_month: null,
  active: true,
});

const TILES: BillOccurrenceView[] = [
  { bill: bill("1", "Aluguel", 1800, 5), month: "2026-10-01", dueDate: "2026-10-05", status: "paga", payment: { id: "p", amount: -1800, occurred_on: "2026-10-04" } },
  { bill: bill("2", "Internet", 119.9, 12), month: "2026-10-01", dueDate: "2026-10-12", status: "vence-logo", payment: null },
  { bill: bill("3", "Luz", 212.4, 8), month: "2026-10-01", dueDate: "2026-10-08", status: "atrasada", payment: null },
  { bill: bill("4", "Condomínio", 650, 20), month: "2026-10-01", dueDate: "2026-10-20", status: "prevista", payment: null },
];

const FLOW = [
  { label: "mai/26", income: 9200, expense: 7100 },
  { label: "jun/26", income: 9200, expense: 8400 },
  { label: "jul/26", income: 9800, expense: 7600 },
  { label: "ago/26", income: 9200, expense: 9900 },
  { label: "set/26", income: 9200, expense: 6800 },
  { label: "out/26", income: 4600, expense: 3900 },
];

export default function ComponentsPage() {
  return (
    <>
      <PageHeader
        title="Componentes"
        description="Tudo o que o app usa, com dados de exemplo. Troque o tema no menu do usuário para conferir claro e escuro."
      />
      <div className="flex flex-col gap-14">
        <Showcase title="Cores">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOKENS.map((t) => (
              <li key={t.token} className="flex items-center gap-3">
                <span className="size-10 shrink-0 rounded-full border" style={{ backgroundColor: `var(${t.token})` }} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.use}</span>
                </span>
              </li>
            ))}
          </ul>
        </Showcase>

        <Showcase title="Tipografia" note="Onest em todo o app. Escala de 1,25; números sempre tabulares.">
          <div className="flex flex-col gap-3">
            <p className="text-display font-semibold">Contas de outubro</p>
            <p className="text-2xl font-semibold">Entradas e saídas</p>
            <p className="text-xl font-semibold">Saldo da casa</p>
            <p>Texto corrido: as contas, os gastos e as tarefas de vocês dois, no mesmo lugar.</p>
            <p className="text-sm text-muted-foreground">Texto de apoio, para descrições e rótulos.</p>
            <p className="flex flex-wrap gap-6 text-lg">
              <Money value={1234.56} />
              <Money value={-87.9} />
              <Money value={3500} sign="always" />
            </p>
          </div>
        </Showcase>

        <Showcase title="Marca" note="O ícone do app.">
          <div className="flex items-center gap-4">
            <AzulejoMark className="size-16 text-primary" />
            <AzulejoMark className="size-10 text-primary" />
            <AzulejoMark className="size-6 text-primary" />
          </div>
        </Showcase>

        <Showcase title="Contas fixas" note="Paga, vence logo, atrasada e a pagar.">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]">
            {TILES.map((o) => (
              <li key={o.bill.id}>
                <BillTile occurrence={o} />
              </li>
            ))}
          </ul>
        </Showcase>

        <Showcase title="Botões">
          <div className="flex flex-wrap gap-2">
            <Button>Marcar como pago</Button>
            <Button variant="outline">Transferir</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="destructive">Apagar</Button>
            <Button variant="link">Ver quadro</Button>
            <Button disabled>Desabilitado</Button>
          </div>
        </Showcase>

        <Showcase title="Formulários">
          <FormSamples />
        </Showcase>

        <Showcase title="Selos, pessoas e progresso">
          <div className="flex flex-wrap items-center gap-4">
            <Badge>Padrão</Badge>
            <Badge variant="secondary">Inativa</Badge>
            <Badge variant="outline">Prevista</Badge>
            <Badge variant="outline" className="border-warning text-warning-foreground">
              Vence logo
            </Badge>
            <Badge variant="outline" className="border-destructive text-destructive">
              Atrasada
            </Badge>
            <PersonAvatar name="Ana" color="#0078C8" />
            <PersonAvatar name="Léo" color="#E8590C" />
            <Progress value={62} className="h-1.5 w-40" aria-label="Exemplo de progresso" />
          </div>
        </Showcase>

        <Showcase title="Gráficos" note="Cores validadas para daltonismo nos dois temas.">
          <div className="grid gap-10 lg:grid-cols-2">
            <IncomeExpenseChart data={FLOW} />
            <BalanceChart data={FLOW.map((f, i) => ({ label: f.label, balance: 12000 + i * 900 - (i === 3 ? 2400 : 0) }))} />
            <CategoryBreakdown
              items={[
                { key: "1", label: "Moradia", value: 1800, color: "#4C6EF5", icon: <IconBubble icon={categoryIcon("house")} color="#4C6EF5" size="sm" /> },
                { key: "2", label: "Mercado", value: 1240.5, color: "#37B24D", icon: <IconBubble icon={categoryIcon("shopping-cart")} color="#37B24D" size="sm" /> },
                { key: "3", label: "Restaurantes e delivery", value: 410, color: "#F76707", icon: <IconBubble icon={categoryIcon("utensils")} color="#F76707" size="sm" /> },
              ]}
            />
            <MoneyMovement income={9200} expense={7540.3} />
          </div>
        </Showcase>

        <Showcase title="Avisos e estados vazios">
          <div className="grid gap-4 md:grid-cols-2">
            <Alert>
              <AlertTitle>3 linhas ficaram de fora</AlertTitle>
              <AlertDescription>linha 4: data inválida</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>Não deu para ler o arquivo</AlertTitle>
              <AlertDescription>Envie o extrato em .csv ou .xlsx.</AlertDescription>
            </Alert>
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>Nenhuma movimentação neste mês</EmptyTitle>
                <EmptyDescription>Adicione um gasto ou importe o extrato.</EmptyDescription>
              </EmptyHeader>
            </Empty>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </Showcase>
      </div>
    </>
  );
}

function Showcase({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 border-b pb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}
