"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Button } from "@/components/ui/button";
import { undoImport } from "@/lib/actions/finance";

type Batch = { id: string; file_name: string; row_count: number; created_at: string; account: string };

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function ImportHistory({ batches }: { batches: Batch[] }) {
  const [undoing, setUndoing] = useState<Batch | null>(null);
  if (batches.length === 0) return null;

  return (
    <section className="mt-12" aria-labelledby="import-history">
      <h2 id="import-history" className="mb-2 border-b pb-2 font-semibold">
        Importações recentes
      </h2>
      <ul className="divide-y">
        {batches.map((b) => (
          <li key={b.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{b.file_name}</p>
              <p className="text-sm text-muted-foreground">
                {b.row_count} movimentações em {b.account}, {dateTime.format(new Date(b.created_at))}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setUndoing(b)}>
              Desfazer
            </Button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={undoing !== null}
        onOpenChange={(o) => !o && setUndoing(null)}
        title="Desfazer esta importação?"
        description={
          undoing
            ? `As ${undoing.row_count} movimentações de ${undoing.file_name} serão apagadas, junto com o ajuste de saldo feito por ela.`
            : ""
        }
        confirmLabel="Desfazer importação"
        action={() => (undoing ? undoImport(undoing.id) : Promise.resolve(null))}
      />
    </section>
  );
}
