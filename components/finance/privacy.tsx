"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// "Esconder valores" (o olho do app de banco). Fica salvo só neste aparelho.

const KEY = "casa:ocultar-valores";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

const PrivacyContext = createContext<{ hidden: boolean; toggle: () => void }>({ hidden: false, toggle: () => {} });

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  const toggle = useCallback(() => {
    try {
      localStorage.setItem(KEY, read() ? "0" : "1");
    } catch {}
    for (const l of listeners) l();
  }, []);
  return <PrivacyContext value={{ hidden, toggle }}>{children}</PrivacyContext>;
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export function PrivacyToggle({ className }: { className?: string }) {
  const { hidden, toggle } = usePrivacy();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Mostrar valores" : "Esconder valores"}
      className={cn(
        "grid size-10 place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none",
        className,
      )}
    >
      {hidden ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
    </button>
  );
}
