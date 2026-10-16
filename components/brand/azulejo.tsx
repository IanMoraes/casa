import { cn } from "@/lib/utils";

// O ladrilho da marca: quatro quartos de círculo nos cantos e um losango no
// centro, como num azulejo português de padrão. Usa currentColor.
export function AzulejoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-10", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="48" height="48" rx="10" fill="currentColor" />
      <g transform="translate(8.5 8.5) scale(0.6458)" className="fill-azulejo-ink">
        <path d="M0 4a4 4 0 0 1 4-4h8a12 12 0 0 1-12 12z" />
        <path d="M48 4a4 4 0 0 0-4-4h-8a12 12 0 0 0 12 12z" />
        <path d="M0 44a4 4 0 0 0 4 4h8a12 12 0 0 0-12-12z" />
        <path d="M48 44a4 4 0 0 1-4 4h-8a12 12 0 0 1 12-12z" />
        <path d="M24 9 39 24 24 39 9 24z" />
      </g>
      <circle cx="24" cy="24" r="3.2" fill="currentColor" />
    </svg>
  );
}
