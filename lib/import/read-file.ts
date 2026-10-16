"use client";

import type { Sheet } from "./types";

// Lê CSV ou XLSX no navegador e devolve uma tabela. O arquivo não sai do
// aparelho; só as linhas confirmadas vão para o banco.
export async function readStatementFile(file: File): Promise<Sheet> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    // Sem cellDates: datas chegam como número serial e são convertidas sem
    // passar pelo fuso horário do aparelho (ver cellDate).
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const first = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Sheet[number]>(first, { header: 1, raw: true, defval: null });
  }

  if (name.endsWith(".csv") || file.type === "text/csv") {
    const Papa = (await import("papaparse")).default;
    const text = await readText(file);
    const result = Papa.parse<string[]>(text, { skipEmptyLines: false });
    return result.data;
  }

  throw new Error("Formato não suportado. Envie o extrato em .csv ou .xlsx.");
}

// CSV do Mercado Pago pode vir em UTF-8 (com BOM) ou Latin-1.
async function readText(file: File) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  const text = utf8.includes("�") ? new TextDecoder("windows-1252").decode(buffer) : utf8;
  return text.replace(/^﻿/, "");
}
