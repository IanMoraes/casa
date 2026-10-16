"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/actions/result";

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

// Envia o formulário para uma Server Action sem limpar os campos quando dá
// erro (o reset automático do React apagaria o que a pessoa digitou).
export function useActionForm(action: Action, options: { onSuccess?: () => void; toastOnSuccess?: boolean } = {}) {
  const [state, setState] = useState<ActionResult>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(state, formData);
      setState(result);
      if (result?.ok) {
        if (options.toastOnSuccess !== false) toast.success(result.message);
        options.onSuccess?.();
      } else if (result && !result.fieldErrors) {
        toast.error(result.error);
      }
    });
  }

  function errorFor(name: string) {
    return state && !state.ok ? state.fieldErrors?.[name] : undefined;
  }

  return { state, pending, onSubmit, errorFor, reset: () => setState(null) };
}
