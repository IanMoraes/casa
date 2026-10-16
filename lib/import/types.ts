import type { IsoDate } from "@/lib/dates";

// Uma célula lida do arquivo: o XLSX pode trazer número ou data de verdade.
export type Cell = string | number | Date | null | undefined;
export type Sheet = Cell[][];

export type StatementRow = {
  occurredOn: IsoDate;
  description: string;
  amount: number; // com sinal: positivo entra, negativo sai
  externalId: string;
  balanceAfter: number | null;
};

export type ParsedStatement = {
  rows: StatementRow[];
  initialBalance: number | null;
  finalBalance: number | null;
  // Linhas que não deu para ler, com o motivo, para mostrar na revisão.
  skipped: { line: number; reason: string }[];
};

export type StatementParser = {
  id: string;
  label: string;
  parse(sheet: Sheet): ParsedStatement;
};
