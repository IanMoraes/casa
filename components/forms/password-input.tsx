"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export function PasswordInput({ invalid, ...props }: Omit<ComponentProps<"input">, "type"> & { invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <InputGroup className="h-10 md:h-9">
      <InputGroupInput type={visible ? "text" : "password"} aria-invalid={invalid || undefined} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-sm"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Esconder a senha" : "Mostrar a senha"}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
