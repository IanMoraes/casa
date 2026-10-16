"use client";

import {
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import { CheckCircle2Icon, FileSpreadsheetIcon, Loader2Icon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Money } from "@/components/finance/money";
import type { AccountOption, CategoryOption, MemberOption } from "@/components/finance/types";
import { FormField, SelectField } from "@/components/forms/fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { findImported, importStatement } from "@/lib/actions/finance";
import { formatDate, formatDay, monthLabel } from "@/lib/dates";
import { suggestCategory } from "@/lib/import/categorize";
import { mercadoPago } from "@/lib/import/mercado-pago";
import { readStatementFile } from "@/lib/import/read-file";
import type { ParsedStatement } from "@/lib/import/types";
import { cn } from "@/lib/utils";

type ReviewRow = {
  externalId: string;
  occurredOn: string;
  description: string;
  amount: number;
  categoryId: string | null;
  duplicate: boolean;
};

// Fora do componente para manter referências estáveis (exigência da v9).
const features = tableFeatures({ rowSelectionFeature });
const column = createColumnHelper<typeof features, ReviewRow>();

type ImportDone = { message: string; months: string[] };

type Review = {
  fileName: string;
  accountId: string;
  rows: ReviewRow[];
  finalBalance: number | null;
  skipped: ParsedStatement["skipped"];
};

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
  const [done, setDone] = useState<ImportDone | null>(null);
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
      const existing = new Set(await findImported(accountId, parsed.rows.map((r) => r.externalId)));
      setReview({
        fileName: file.name,
        accountId,
        finalBalance: parsed.finalBalance,
        skipped: parsed.skipped,
        rows: parsed.rows.map((r) => ({
          externalId: r.externalId,
          occurredOn: r.occurredOn,
          description: r.description,
          amount: r.amount,
          categoryId: suggestCategory(r.description, r.amount, categories),
          duplicate: existing.has(r.externalId),
        })),
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
        <AlertDescription>Vá em Contas e cofrinhos e crie a conta que vai receber o extrato.</AlertDescription>
      </Alert>
    );
  }

  if (done) {
    const last = done.months.at(-1);
    return (
      <div className="card-surface flex max-w-xl flex-col items-start gap-3 p-5">
        <CheckCircle2Icon className="size-8 text-income" aria-hidden />
        <div>
          <p className="text-lg font-bold">{done.message}</p>
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
          <Button variant="outline" onClick={() => setDone(null)}>
            Importar outro arquivo
          </Button>
        </div>
      </div>
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
          setDone(result);
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
            No Mercado Pago, abra o extrato da conta e baixe o período em CSV ou Excel.
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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(() =>
    Object.fromEntries(
      review.rows.flatMap((r, i) => (r.duplicate ? [] : [[String(i), true as const]])),
    ),
  );
  const [adjust, setAdjust] = useState(review.finalBalance !== null);
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      column.columns([
      column.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected() || (table.getIsSomeRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllRowsSelected(Boolean(v))}
            aria-label="Selecionar todas"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
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
        cell: ({ row }) => (
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <span className="line-clamp-2">{row.original.description}</span>
              {row.original.duplicate ? <Badge variant="secondary">Já importada</Badge> : null}
            </span>
            <Money value={row.original.amount} sign="always" className="font-medium sm:hidden" />
          </span>
        ),
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
    [categories],
  );

  const table = useTable({
    features,
    data: rows,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
  });

  const selected = rows.filter((_, i) => rowSelection[String(i)]);

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
          onImported({ message: result.message, months: [...new Set(selected.map((r) => r.occurredOn.slice(0, 7)))].sort() });
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-medium">{review.fileName}</p>
          <p className="text-sm text-muted-foreground">
            {rows.length} linhas para {accountName}. Confira as categorias e desmarque o que não quer importar.
          </p>
        </div>
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
                className={cn(!row.getIsSelected() && "opacity-60")}
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
