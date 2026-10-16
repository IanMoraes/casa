import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { getCategories } from "@/lib/data/finance";
import { toCategoryOptions } from "@/lib/data/options";

import { CategoriesView } from "./categories-view";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <>
      <PageHeader
        title="Categorias"
        description="As palavras-chave ajudam a sugerir a categoria quando vocês importam um extrato."
      />
      <CategoriesView categories={toCategoryOptions(categories)} />
    </>
  );
}
