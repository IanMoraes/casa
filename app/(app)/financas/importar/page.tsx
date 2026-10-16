import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { getAccounts, getCategories, getImportBatches } from "@/lib/data/finance";
import { toAccountOptions, toCategoryOptions, toMemberOptions } from "@/lib/data/options";
import { getHousehold } from "@/lib/data/session";

import { ImportHistory } from "./import-history";
import { ImportView } from "./import-view";

export const metadata: Metadata = { title: "Importar extrato" };

export default async function ImportPage() {
  const ctx = await getHousehold();
  const [accounts, categories, batches] = await Promise.all([getAccounts(null), getCategories(), getImportBatches()]);

  return (
    <>
      <PageHeader
        title="Importar extrato"
        description="Extrato da conta do Mercado Pago em CSV ou Excel. O arquivo é lido aqui no aparelho; só as linhas que você confirmar são salvas."
      />
      <ImportView
        accounts={toAccountOptions(accounts)}
        categories={toCategoryOptions(categories)}
        members={toMemberOptions(ctx.members)}
      />
      <ImportHistory
        batches={batches.map((b) => ({
          id: b.id,
          file_name: b.file_name,
          row_count: b.row_count,
          created_at: b.created_at,
          account: accounts.find((a) => a.id === b.account_id)?.name ?? "Conta apagada",
        }))}
      />
    </>
  );
}
