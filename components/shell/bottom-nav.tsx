"use client";

import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  HouseIcon,
  KeyRoundIcon,
  ListChecksIcon,
  ListPlusIcon,
  LogOutIcon,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  PlusIcon,
  ReceiptTextIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";

import { IconBubble } from "@/components/finance/category-badge";
import { PersonAvatar } from "@/components/shell/person-avatar";
import { useQuickActions, type QuickActionKind } from "@/components/shell/quick-actions";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { signOutAction } from "@/lib/actions/household";
import { NAV_GROUPS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Me = { display_name: string; color: string; avatar_url: string | null };

const TABS = [
  { title: "Início", href: "/", icon: HouseIcon },
  { title: "Extrato", href: "/financas/movimentacoes", icon: ReceiptTextIcon },
  null, // botão "+"
  { title: "Tarefas", href: "/tarefas", icon: ListChecksIcon },
] as const;

// Barra inferior do celular: 4 destinos, "+" no meio e "Mais".
export function BottomNav({ me, email, householdName }: { me: Me; email: string; householdName: string }) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
          {TABS.map((tab, i) =>
            tab ? (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={isActive(pathname, tab.href) ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1.5 text-[0.7rem] font-medium text-muted-foreground",
                    isActive(pathname, tab.href) && "text-primary",
                  )}
                >
                  <tab.icon className="size-6" strokeWidth={isActive(pathname, tab.href) ? 2.4 : 2} aria-hidden />
                  {tab.title}
                </Link>
              </li>
            ) : (
              <li key={`add-${i}`} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  aria-label="Adicionar"
                  className="-mt-6 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
                >
                  <PlusIcon className="size-7" strokeWidth={2.4} />
                </button>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex w-full flex-col items-center gap-0.5 py-1.5 text-[0.7rem] font-medium text-muted-foreground"
            >
              <MenuIcon className="size-6" aria-hidden />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <AddSheet open={addOpen} onOpenChange={setAddOpen} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} me={me} email={email} householdName={householdName} />
    </>
  );
}

const ADD_OPTIONS: { kind: QuickActionKind; label: string; hint: string; icon: typeof PlusIcon; color: string }[] = [
  { kind: "saida", label: "Gasto", hint: "Dinheiro que saiu", icon: ArrowUpRightIcon, color: "#E03131" },
  { kind: "entrada", label: "Entrada", hint: "Dinheiro que entrou", icon: ArrowDownLeftIcon, color: "#00A650" },
  { kind: "transferencia", label: "Transferência", hint: "Entre contas da casa", icon: ArrowLeftRightIcon, color: "#0078C8" },
  { kind: "tarefa", label: "Tarefa", hint: "Algo para fazer", icon: ListPlusIcon, color: "#F76707" },
];

function AddSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const quick = useQuickActions();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
        <SheetHeader>
          <SheetTitle>Adicionar</SheetTitle>
          <SheetDescription className="sr-only">Escolha o que adicionar</SheetDescription>
        </SheetHeader>
        <ul className="grid grid-cols-2 gap-3 px-4 pb-6">
          {ADD_OPTIONS.map((o) => (
            <li key={o.kind}>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  quick.open(o.kind);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left active:scale-[0.98]"
              >
                <IconBubble icon={o.icon} color={o.color} />
                <span className="min-w-0">
                  <span className="block font-semibold">{o.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{o.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

function MoreSheet({
  open,
  onOpenChange,
  me,
  email,
  householdName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  me: Me;
  email: string;
  householdName: string;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-3xl pb-safe">
        <SheetHeader className="flex-row items-center gap-3">
          <PersonAvatar name={me.display_name} color={me.color} src={me.avatar_url} className="size-11" />
          <div className="min-w-0 text-left">
            <SheetTitle className="truncate">{me.display_name}</SheetTitle>
            <SheetDescription className="truncate">
              {householdName} · {email}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          {NAV_GROUPS.map((group) => (
            <section key={group.label}>
              <h2 className="mb-1 px-1 text-xs font-medium text-muted-foreground">{group.label}</h2>
              <ul className="overflow-hidden rounded-2xl border bg-surface">
                {group.items.map((item) => (
                  <li key={item.href} className="border-b last:border-b-0">
                    <Link
                      href={item.href}
                      onClick={close}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 font-medium",
                        isActive(pathname, item.href) && "text-primary",
                      )}
                    >
                      <item.icon className="size-5 text-muted-foreground" aria-hidden />
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h2 className="mb-1 px-1 text-xs font-medium text-muted-foreground">Aparência</h2>
            <ToggleGroup
              type="single"
              variant="outline"
              value={theme ?? "system"}
              onValueChange={(v) => v && setTheme(v)}
              className="w-full *:flex-1"
              aria-label="Tema"
            >
              <ToggleGroupItem value="light">
                <SunIcon /> Claro
              </ToggleGroupItem>
              <ToggleGroupItem value="dark">
                <MoonIcon /> Escuro
              </ToggleGroupItem>
              <ToggleGroupItem value="system">
                <MonitorIcon /> Auto
              </ToggleGroupItem>
            </ToggleGroup>
          </section>

          <ul className="overflow-hidden rounded-2xl border bg-surface">
            {[
              { href: "/configuracoes", label: "Configurações", icon: SettingsIcon },
              { href: "/redefinir-senha", label: "Trocar senha", icon: KeyRoundIcon },
              { href: "/componentes", label: "Componentes", icon: PaletteIcon },
            ].map((item) => (
              <li key={item.href} className="border-b">
                <Link href={item.href} onClick={close} className="flex items-center gap-3 px-3 py-3 font-medium">
                  <item.icon className="size-5 text-muted-foreground" aria-hidden />
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <form action={signOutAction}>
                <button type="submit" className="flex w-full items-center gap-3 px-3 py-3 font-medium text-destructive">
                  <LogOutIcon className="size-5" aria-hidden />
                  Sair
                </button>
              </form>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
