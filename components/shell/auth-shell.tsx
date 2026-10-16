import type { ReactNode } from "react";

import { AzulejoMark } from "@/components/brand/azulejo";

// Moldura das telas sem login: faixa azul com a marca e um cartão branco.
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="bg-gradient-to-b from-hero to-hero-strong px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-24 text-hero-foreground">
        <div className="mx-auto w-full max-w-md">
          <AzulejoMark className="size-12 text-white [--azulejo-ink:var(--hero)]" />
          <h1 className="mt-5 text-3xl font-bold">{title}</h1>
          {subtitle ? <p className="mt-2 text-pretty text-hero-foreground/90">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mx-auto -mt-16 w-full max-w-md px-4 pb-10">
        <div className="card-surface p-5 sm:p-6">{children}</div>
      </div>
    </main>
  );
}
