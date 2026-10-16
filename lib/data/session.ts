import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Member = Tables<"household_members">;

export type HouseholdContext = {
  userId: string;
  household: Tables<"households">;
  members: Member[];
  me: Member;
};

// Usuário logado (validado pelo JWT). Sem login, vai para /login.
export const getUserId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) redirect("/login");
  return sub;
});

export const getUserProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? "",
    name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? "",
    avatarUrl: (meta.avatar_url as string | undefined) ?? (meta.picture as string | undefined) ?? null,
  };
});

// Casa do usuário. Quem ainda não tem casa vai para /bem-vindo.
export const getHousehold = cache(async (): Promise<HouseholdContext> => {
  const userId = await getUserId();
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("household_members")
    .select("*")
    .order("created_at");
  if (error) throw new Error(`Não foi possível carregar a casa: ${error.message}`);

  const me = members.find((m) => m.user_id === userId);
  if (!me) redirect("/bem-vindo");

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("*")
    .eq("id", me.household_id)
    .single();
  if (householdError) throw new Error(`Não foi possível carregar a casa: ${householdError.message}`);

  return { userId, household, members, me };
});

// "?pessoa=<id>" filtra pelo dono; ausente ou inválido = casa toda.
export function resolvePerson(ctx: HouseholdContext, value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return ctx.members.find((m) => m.user_id === raw) ?? null;
}
