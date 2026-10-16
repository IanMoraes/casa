import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Círculo colorido com o ícone da categoria (fundo claro da mesma cor).
export function IconBubble({
  icon: Icon,
  color,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        size === "sm" && "size-8 [&_svg]:size-4",
        size === "md" && "size-10 [&_svg]:size-[1.15rem]",
        size === "lg" && "size-12 [&_svg]:size-5",
        className,
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
      aria-hidden
    >
      <Icon strokeWidth={2.2} />
    </span>
  );
}
