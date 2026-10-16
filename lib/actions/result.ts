import type { ZodError } from "zod";

export type ActionResult =
  | { ok: true; message: string; at: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; at: number }
  | null;

export function success(message: string): ActionResult {
  return { ok: true, message, at: Date.now() };
}

export function failure(error: string, fieldErrors?: Record<string, string>): ActionResult {
  return { ok: false, error, fieldErrors, at: Date.now() };
}

export function fromZod(error: ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return failure("Confira os campos destacados.", fieldErrors);
}

// Mensagens do Postgres traduzidas para algo que dá para agir.
export function fromDb(error: { message: string; code?: string }, fallback: string): ActionResult {
  if (error.code === "23505") return failure("Isso já foi registrado antes.");
  if (error.code === "23503") return failure("Um dos itens escolhidos não existe mais. Recarregue a página.");
  if (error.code === "42501") return failure("Sem permissão para isso. Entre de novo e tente outra vez.");
  if (error.code === "P0001") return failure(error.message);
  return failure(`${fallback} (${error.message})`);
}
