"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/app/actions/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { closeParentDialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Formulář napojený na server action přes useActionState.
 * Po úspěchu volitelně vyresetuje pole a zavře nadřazený dialog.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Uložit",
  className,
  resetOnSuccess = false,
  closeDialogOnSuccess = false,
  hideSuccess = false,
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  closeDialogOnSuccess?: boolean;
  hideSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.success) return;
    if (resetOnSuccess) ref.current?.reset();
    if (closeDialogOnSuccess) closeParentDialog(ref.current);
  }, [state, resetOnSuccess, closeDialogOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={cn("space-y-4", className)}>
      {children}
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.success && !hideSuccess && <Alert tone="success">{state.success}</Alert>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
