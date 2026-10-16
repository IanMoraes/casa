import {
  CalendarClockIcon,
  FileUpIcon,
  HouseIcon,
  LandmarkIcon,
  ListChecksIcon,
  ReceiptTextIcon,
  TagsIcon,
  type LucideIcon,
} from "lucide-react";

// Itens do menu. Um módulo novo (lista de compras, objetivos…) é só mais uma
// entrada aqui; ele aparece no menu lateral (PC) e no "Mais" (celular).

export type NavItem = { title: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dia a dia",
    items: [
      { title: "Início", href: "/", icon: HouseIcon },
      { title: "Extrato", href: "/financas/movimentacoes", icon: ReceiptTextIcon },
      { title: "Contas fixas", href: "/financas/contas-fixas", icon: CalendarClockIcon },
      { title: "Tarefas", href: "/tarefas", icon: ListChecksIcon },
    ],
  },
  {
    label: "Dinheiro",
    items: [
      { title: "Contas e cofrinhos", href: "/financas/contas", icon: LandmarkIcon },
      { title: "Importar extrato", href: "/financas/importar", icon: FileUpIcon },
      { title: "Categorias", href: "/financas/categorias", icon: TagsIcon },
    ],
  },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
