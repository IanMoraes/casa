import type { ReactNode } from "react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// Cabeçalho das páginas internas. No celular fica preso no topo ao rolar.
export function PageHeader({
  title,
  description,
  filters,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3 pb-5", className)}>
      <div className="sticky top-0 z-30 -mx-4 flex min-h-14 items-center gap-2 bg-background/90 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur md:static md:mx-0 md:min-h-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <SidebarTrigger className="-ml-1 hidden md:inline-flex" aria-label="Recolher o menu" />
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold md:text-2xl">{title}</h1>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <p className="-mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {filters ? <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div> : null}
    </header>
  );
}
