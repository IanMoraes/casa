"use client";

import {
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import { CheckCircle2Icon, FileSpreadsheetIcon, Loader2Icon, RepeatIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { BillForm } from "@/components/finance/bill-forms";
import { IconBubble } from "@/components/finance/category-badge";
import { Money } from "@/components/finance/money";
import type { AccountOption, CategoryOption, MemberOption } from "@/components/finance/types";
import { FormField, SelectField } from "@/components/forms/fields";
import { ResponsiveDialog } from "@/components/forms/responsive-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { importStatement, loadImportContext } from "@/lib/actions/finance";
import { SPECIAL_ICONS } from "@/lib/categories";
import { addMonths, currentMonth, formatDate, formatDay, monthLabel } from "@/lib/dates";
import {
  detectRecurring,
  findPossibleDuplicates,
  type ExistingTx,
  type RecurringSuggestion,
} from "@/lib/import/analyze";
import { suggestCategory } from "@/lib/import/categorize";
import { mercadoPago } from "@/lib/import/mercado-pago";
import { readStatementFile } from "@/lib/import/read-file";
import type { ParsedStatement } from "@/lib/import/types";
import { cn } from "@/lib/utils";

// "exact": o mesmo ID de operação já foi importado. "possible": mesmo valor em
// data próxima de algo que já está na conta (lançado à mão ou de outro arquivo).
type DupInfo = { kind: "exact" } | { kind: "possible"; existingDescription: string; existingDate: string };

type ReviewRow = {
  externalId: string;
  occurredOn: string;
  description: string;
  amount: number;
  categoryId: string | null;
  dup: DupInfo | null;
};

// Fora do componente para manter referências estáveis (exigência da v9).
const features = tableFeatures({ rowSelectionFeature });
const column = createColumnHelper<typeof features, ReviewRow>();

type ImportDone = {
  message: string;
  months: string[];
  ignored: { exact: number; possible: number };
  suggestions: RecurringSuggestion[];
};

type Review = {
  fileName: string;
  accountId: string;
  rows: ReviewRow[];
  finalBalance: number | null;
  skipped: ParsedStatement["skipped"];
  existing: ExistingTx[];
  billDescriptions: string[];
};

type View = "todas" | "novas" | "repetidas";

export function ImportView({
  accounts,
  categories,
  members,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
}) {
  const mpAccount = accounts.find((a) => a.bank?.toLowerCase().includes("mercado"));
  const [accountId, setAccountId] = useState<string | undefined>(mpAccount?.id ?? accounts[0]?.id);
  const [review, setReview] = useState<Review | null>(null);
  const [done, setDone] = useState<(ImportDone & { accountId: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const ownerName = (id: string) => members.find((m) => m.user_id === id)?.display_name ?? "";

  async function onFile(file: File) {
    if (!accountId) {
      setError("Escolha primeiro a conta que vai receber as movimentações.");
      return;
    }
    setError(null);
    setReading(true);
    try {
      const sheet = await readStatementFile(file);
      const parsed = mercadoPago.parse(sheet);
      if (parsed.rows.length === 0) throw new Error("O arquivo não tem nenhuma movimentação.");

      const dates = parsed.rows.map((r) => r.occurredOn).sort();
      const context = await loadImportContext(
        accountId,
        parsed.rows.map((r) => r.externalId),
        dates[0],
        dates.at(-1)!,
      );
      const imported = new Set(context.importedIds);

      // Parecidas: só entre as que não são repetidas certas.
      const candidates = parsed.rows
        .map((r, index) => ({ r, index }))
        .filter(({ r }) => !imported.has(r.externalId));
      const possible = findPossibleDuplicates(
        candidates.map(({ r }) => r),
        context.existing,
      );

      setReview({
        fileName: file.name,
        accountId,
        finalBalance: parsed.finalBalance,
        skipped: parsed.skipped,
        existing: context.existing,
        billDescriptions: context.billDescriptions,
        rows: parsed.rows.map((r, index) => {
          let dup: DupInfo | null = null;
          if (imported.has(r.externalId)) dup = { kind: "exact" };
          else {
            const match = possible.get(candidates.findIndex((c) => c.index === index));
            if (match) dup = { kind: "possible", ...match };
          }
          return {
            externalId: r.externalId,
            occurredOn: r.occurredOn,
            description: r.description,
            amount: r.amount,
            categoryId: suggestCategory(r.description, r.amount, categories),
            dup,
          };
        }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setReading(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    onDropAccepted: (files) => onFile(files[0]),
    onDropRejected: () => setError("Envie o extrato em .csv ou .xlsx."),
    disabled: reading || accounts.length === 0,
  });

  if (accounts.length === 0) {
    return (
      <Alert>
        <AlertTitle>Cadastre a conta do Mercado Pago primeiro</AlertTitle>
        <AlertDescription>Vá em Contas e crie a conta que vai receber o extrato.</AlertDescription>
      </Alert>
    );
  }

  if (done) {
    return (
      <ImportFinished
        done={done}
        account={accounts.find((a) => a.id === done.accountId)}
        accounts={accounts}
        categories={categories}
        members={members}
        onAnother={() => setDone(null)}
      />
    );
  }

  if (review) {
    return (
      <ReviewTable
        review={review}
        accountName={accounts.find((a) => a.id === review.accountId)?.name ?? ""}
        categories={categories}
        onCancel={() => setReview(null)}
        onImported={(result) => {
          setReview(null);
          setDone({ ...result, accountId: review.accountId });
        }}
      />
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <FormField label="Conta que recebe as movimentações" htmlFor="imp-account">
        <SelectField
          id="imp-account"
          name="account_id"
          defaultValue={accountId}
          onValueChange={setAccountId}
          options={accounts.map((a) => ({ value: a.id, label: `${a.name} · ${ownerName(a.owner_id)}` }))}
        />
      </FormField>

      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          isDragActive ? "border-primary bg-accent" : "border-input hover:border-primary/60",
        )}
      >
        <input {...getInputProps()} aria-label="Arquivo do extrato" />
        {reading ? (
          <Loader2Icon className="size-8 animate-spin text-primary" aria-hidden />
        ) : (
          <UploadIcon className="size-8 text-primary" aria-hidden />
        )}
        <div>
          <p className="font-medium">{reading ? "Lendo o extrato…" : "Escolha ou arraste o extrato aqui"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No Mercado Pago, abra o extrato da conta e baixe o período em CSV ou Excel. O que já foi importado não
            entra de novo.
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <FileSpreadsheetIcon />
          <AlertTitle>Não deu para ler o arquivo</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revisão: o que vai ser importado e o que foi reconhecido como repetido
// ---------------------------------------------------------------------------

function ReviewTable({
  review,
  accountName,
  categories,
  onCancel,
  onImported,
}: {
  review: Review;
  accountName: string;
  categories: CategoryOption[];
  onCancel: () => void;
  onImported: (done: ImportDone) => void;
}) {
  const [rows, setRows] = useState(review.rows);
  // Só as novas já vêm marcadas. Repetidas certas não podem ser marcadas.
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(() =>
    Object.fromEntries(review.rows.flatMap((r, i) => (r.dup ? [] : [[String(i), true as const]]))),
  );
  const [view, setView] = useState<View>("todas");
  const [adjust, setAdjust] = useState(review.finalBalance !== null);
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const counts = useMemo(() => {
    let exact = 0;
    let possible = 0;
    for (const r of rows) {
      if (r.dup?.kind === "exact") exact += 1;
      else if (r.dup?.kind === "possible") possible += 1;
    }
    return { exact, possible, fresh: rows.length - exact - possible };
  }, [rows]);

  const isShown = (r: ReviewRow) => (view === "todas" ? true : view === "novas" ? !r.dup : Boolean(r.dup));
  const isSelectable = (r: ReviewRow) => r.dup?.kind !== "exact";
  const visibleSelectable = rows.flatMap((r, i) => (isShown(r) && isSelectable(r) ? [String(i)] : []));
  const allVisibleSelected = visibleSelectable.length > 0 && visibleSelectable.every((i) => rowSelection[i]);
  const someVisibleSelected = visibleSelectable.some((i) => rowSelection[i]);

  function toggleAllVisible(value: boolean) {
    setRowSelection((prev) => {
      const next = { ...prev };
      for (const i of visibleSelectable) {
        if (value) next[i] = true;
        else delete next[i];
      }
      return next;
    });
  }

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: "select",
          header: () => (
            <Checkbox
              checked={allVisibleSelected || (someVisibleSelected && "indeterminate")}
              onCheckedChange={(v) => toggleAllVisible(Boolean(v))}
              aria-label="Selecionar todas as linhas visíveis"
              disabled={visibleSelectable.length === 0}
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              disabled={row.original.dup?.kind === "exact"}
              onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
              aria-label={`Importar ${row.original.description}`}
            />
          ),
        }),
        column.accessor("occurredOn", {
          header: "Data",
          cell: (info) => (
            <span className="tabular">
              <span className="sm:hidden">{formatDay(info.getValue())}</span>
              <span className="hidden sm:inline">{formatDate(info.getValue())}</span>
            </span>
          ),
        }),
        column.accessor("description", {
          header: "Descrição",
          cell: ({ row }) => {
            const dup = row.original.dup;
            return (
              <span className="flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="line-clamp-2">{row.original.description}</span>
                  {dup?.kind === "exact" ? <Badge variant="secondary">Já importada</Badge> : null}
                  {dup?.kind === "possible" ? (
                    <Badge variant="outline" className="border-warning text-warning-foreground">
                      Possível repetida
                    </Badge>
                  ) : null}
                </span>
                {dup?.kind === "possible" ? (
                  <span className="text-xs text-muted-foreground">
                    Parece com “{dup.existingDescription}” de {formatDay(dup.existingDate)}, que já está na conta.
                  </span>
                ) : null}
                <Money value={row.original.amount} sign="always" className="font-medium sm:hidden" />
              </span>
            );
          },
        }),
        column.accessor("categoryId", {
          header: "Categoria",
          cell: ({ row }) => {
            const kind = row.original.amount > 0 ? "entrada" : "saida";
            return (
              <select
                className="h-9 w-full min-w-36 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
                value={row.original.categoryId ?? ""}
                aria-label={`Categoria de ${row.original.description}`}
                onChange={(e) => {
                  const value = e.target.value || null;
                  setRows((prev) => prev.map((r, i) => (i === row.index ? { ...r, categoryId: value } : r)));
                }}
              >
                <option value="">Sem categoria</option>
                {categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            );
          },
        }),
        column.accessor("amount", {
          header: () => <span className="block text-right">Valor</span>,
          cell: (info) => <Money value={info.getValue()} sign="always" className="block text-right" />,
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, allVisibleSelected, someVisibleSelected, visibleSelectable.length, view],
  );

  const table = useTable({
    features,
    data: rows,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) => row.original.dup?.kind !== "exact",
  });

  const selected = rows.filter((_, i) => rowSelection[String(i)] && isSelectable(rows[i]));

  function confirm() {
    setSaveError(null);
    startTransition(async () => {
      try {
        const result = await importStatement({
          account_id: review.accountId,
          source: mercadoPago.id,
          file_name: review.fileName,
          final_balance: adjust ? review.finalBalance : null,
          rows: selected.map((r) => ({
            occurredOn: r.occurredOn,
            description: r.description,
            amount: r.amount,
            externalId: r.externalId,
            categoryId: r.categoryId,
          })),
        });
        if (result?.ok) {
          toast.success(result.message);
          // Gastos que se repetem todo mês: o histórico da conta + o que acabou de entrar.
          const suggestions = detectRecurring(
            [
              ...review.existing.map((t) => ({
                occurredOn: t.occurredOn,
                description: t.description,
                amount: t.amount,
                categoryId: t.categoryId,
              })),
              ...selected.map((r) => ({
                occurredOn: r.occurredOn,
                description: r.description,
                amount: r.amount,
                categoryId: r.categoryId,
              })),
            ],
            review.billDescriptions,
          );
          onImported({
            message: result.message,
            months: [...new Set(selected.map((r) => r.occurredOn.slice(0, 7)))].sort(),
            ignored: { exact: counts.exact, possible: rows.filter((r, i) => r.dup?.kind === "possible" && !rowSelection[String(i)]).length },
            suggestions,
          });
        } else if (result) {
          setSaveError(result.error);
        }
      } catch (e) {
        setSaveError(
          `A importação não chegou a ser salva. ${e instanceof Error ? e.message : ""} Tente de novo; se continuar, importe um período menor.`,
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-medium">{review.fileName}</p>
        <p className="text-sm text-muted-foreground">
          {rows.length} linhas para {accountName}. Confira as categorias e desmarque o que não quer importar.
        </p>
      </div>

      <section aria-label="Resumo da leitura" className="grid gap-2 sm:grid-cols-3">
        <SummaryTile label="Novas, para importar" value={counts.fresh} tone="new" />
        <SummaryTile label="Já importadas antes" value={counts.exact} tone="exact" hint="Não entram de novo." />
        <SummaryTile
          label="Possíveis repetidas"
          value={counts.possible}
          tone="possible"
          hint="Ficaram desmarcadas. Marque se for outro gasto."
        />
      </section>

      <div role="radiogroup" aria-label="Mostrar linhas" className="scroll-row flex gap-2 overflow-x-auto">
        {(
          [
            ["todas", `Todas (${rows.length})`],
            ["novas", `Novas (${counts.fresh})`],
            ["repetidas", `Repetidas (${counts.exact + counts.possible})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={view === value}
            onClick={() => setView(value)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              view === value ? "bg-primary text-primary-foreground" : "bg-surface shadow-[var(--shadow-card)] hover:bg-accent",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {review.skipped.length > 0 ? (
        <Alert>
          <AlertTitle>{review.skipped.length} linhas ficaram de fora</AlertTitle>
          <AlertDescription>
            {review.skipped
              .slice(0, 5)
              .map((s) => `linha ${s.line}: ${s.reason.toLowerCase()}`)
              .join("; ")}
            {review.skipped.length > 5 ? "…" : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-x-auto rounded-lg border bg-surface">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} className={cn(header.column.id === "amount" && "hidden sm:table-cell")}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(
                  !isShown(row.original) && "hidden",
                  !row.getIsSelected() && "opacity-60",
                  row.original.dup?.kind === "possible" && !row.getIsSelected() && "bg-warning-soft/40",
                )}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn("whitespace-normal", cell.column.id === "amount" && "hidden sm:table-cell")}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {review.finalBalance !== null ? (
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={adjust} onCheckedChange={(v) => setAdjust(Boolean(v))} className="mt-0.5" />
          <span>
            Ajustar o saldo de {accountName} para <Money value={review.finalBalance} className="font-medium" />, o saldo
            final do extrato. Desmarque se este não for o extrato mais recente.
          </span>
        </label>
      ) : null}

      {saveError ? (
        <Alert variant="destructive">
          <FileSpreadsheetIcon />
          <AlertTitle>Não foi possível importar</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Escolher outro arquivo
        </Button>
        <Button onClick={confirm} disabled={pending || selected.length === 0}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Importar {selected.length} {selected.length === 1 ? "movimentação" : "movimentações"}
        </Button>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "new" | "exact" | "possible";
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-3",
        tone === "new" && "bg-income-soft",
        tone === "exact" && "bg-muted",
        tone === "possible" && (value > 0 ? "bg-warning-soft" : "bg-muted"),
      )}
    >
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular">{value}</p>
      {hint && value > 0 ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Depois de importar: resumo e sugestões de conta fixa
// ---------------------------------------------------------------------------

type Handled = Record<string, "criada" | "ignorada">;

function ImportFinished({
  done,
  account,
  accounts,
  categories,
  members,
  onAnother,
}: {
  done: ImportDone;
  account?: AccountOption;
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
  onAnother: () => void;
}) {
  const last = done.months.at(-1);
  const { suggestions } = done;
  // O modal abre sozinho na primeira sugestão e segue para a próxima.
  const [activeKey, setActiveKey] = useState<string | null>(suggestions[0]?.key ?? null);
  const [handled, setHandled] = useState<Handled>({});
  const active = suggestions.find((s) => s.key === activeKey) ?? null;
  const ownerId = account?.owner_id ?? members[0]?.user_id ?? "";

  function resolve(key: string, how: Handled[string]) {
    const next = { ...handled, [key]: how };
    setHandled(next);
    setActiveKey(suggestions.find((s) => !next[s.key])?.key ?? null);
  }

  const ignoredTotal = done.ignored.exact + done.ignored.possible;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="card-surface flex flex-col items-start gap-3 p-5">
        <CheckCircle2Icon className="size-8 text-income" aria-hidden />
        <div>
          <p className="text-lg font-bold">{done.message}</p>
          {ignoredTotal > 0 ? (
            <p className="text-sm text-muted-foreground">
              {[
                done.ignored.exact > 0
                  ? `${done.ignored.exact} ${done.ignored.exact === 1 ? "já estava importada" : "já estavam importadas"}`
                  : "",
                done.ignored.possible > 0
                  ? `${done.ignored.possible} ${done.ignored.possible === 1 ? "possível repetida ficou de fora" : "possíveis repetidas ficaram de fora"}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              .
            </p>
          ) : null}
          {done.months.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {done.months.length === 1
                ? `Elas estão em ${monthLabel(`${done.months[0]}-01`).toLowerCase()}.`
                : `Elas vão de ${monthLabel(`${done.months[0]}-01`).toLowerCase()} a ${monthLabel(`${last}-01`).toLowerCase()}.`}{" "}
              No extrato, use as setas do mês para ver cada um.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {last ? (
            <Button asChild>
              <Link href={`/financas/movimentacoes?mes=${last}`}>Ver no extrato</Link>
            </Button>
          ) : null}
          <Button variant="outline" onClick={onAnother}>
            Importar outro arquivo
          </Button>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <section aria-labelledby="fixed-suggestions" className="card-surface p-4 md:p-5">
          <div className="mb-1 flex items-center gap-2">
            <RepeatIcon className="size-5 text-primary" aria-hidden />
            <h2 id="fixed-suggestions" className="font-bold">
              {suggestions.length === 1 ? "Este gasto parece uma conta fixa" : "Estes gastos parecem contas fixas"}
            </h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Aparecem todo mês, com valor e dia parecidos. Como conta fixa, entram sozinhos na lista de cada mês, com o
            botão de pagar.
          </p>
          <ul className="divide-y">
            {suggestions.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center gap-3 py-3">
                <IconBubble icon={SPECIAL_ICONS.fixa} color="#0078C8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.description}</p>
                  <p className="text-sm text-muted-foreground">
                    <Money value={s.kind === "saida" ? -s.amount : s.amount} sign="always" /> · perto do dia {s.dueDay} ·
                    em {s.months} meses
                  </p>
                </div>
                {handled[s.key] ? (
                  <Badge variant={handled[s.key] === "criada" ? "secondary" : "outline"}>
                    {handled[s.key] === "criada" ? "Conta fixa criada" : "Ignorada"}
                  </Badge>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setActiveKey(s.key)}>
                      Criar conta fixa
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => resolve(s.key, "ignorada")}>
                      Ignorar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ResponsiveDialog
        open={active !== null}
        onOpenChange={(open) => {
          // Fechar sem salvar equivale a "agora não" para esta sugestão.
          if (!open && active) resolve(active.key, "ignorada");
        }}
        title="Criar conta fixa?"
        description={
          active
            ? `“${active.description}” apareceu em ${active.months} meses, perto do dia ${active.dueDay}. Confira os dados e salve. Ela começa em ${monthLabel(startOf(active)).toLowerCase()}.`
            : undefined
        }
      >
        {active ? (
          <div className="flex flex-col gap-3">
            <BillForm
              key={active.key}
              prefill={{
                description: active.description,
                kind: active.kind,
                amount: active.amount,
                due_day: active.dueDay,
                owner_id: ownerId,
                account_id: account?.id ?? null,
                category_id: active.categoryId,
                start_month: startOf(active),
              }}
              accounts={accounts}
              categories={categories}
              members={members}
              defaultOwnerId={ownerId}
              onDone={() => resolve(active.key, "criada")}
            />
            <Button variant="ghost" onClick={() => resolve(active.key, "ignorada")}>
              Agora não
            </Button>
          </div>
        ) : null}
      </ResponsiveDialog>
    </div>
  );
}

// Começa no mês seguinte ao último visto, mas nunca no passado.
function startOf(s: RecurringSuggestion) {
  const next = addMonths(s.lastMonth, 1);
  const now = currentMonth();
  return next > now ? next : now;
}
