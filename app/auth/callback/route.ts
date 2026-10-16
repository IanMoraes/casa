import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Volta dos links enviados por e-mail (confirmação de cadastro e nova senha):
// troca o código pela sessão e segue para `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (searchParams.get("error_code") === "otp_expired") {
    return NextResponse.redirect(`${origin}/login?erro=expirado`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Ex.: link aberto em outro aparelho. O e-mail já foi confirmado mesmo assim.
  return NextResponse.redirect(`${origin}/login?erro=link`);
}

// Só caminhos internos, para o link não poder mandar a pessoa para outro site.
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
