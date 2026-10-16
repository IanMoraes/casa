import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/shell/auth-shell";
import { getUserProfile } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";

import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function WelcomePage() {
  const profile = await getUserProfile();
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (membership) redirect("/");

  const firstName = profile.name.split(" ")[0] ?? "";

  return (
    <AuthShell
      title={firstName ? `Olá, ${firstName}` : "Olá"}
      subtitle="Crie a casa e mande o código de convite para a outra pessoa, ou entre com o código que você recebeu."
    >
      <Onboarding defaultName={firstName} />
    </AuthShell>
  );
}
