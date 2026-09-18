"use client";

import { useActionState } from "react";
import { teacherLogin } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function TeacherLoginForm() {
  const [state, action, pending] = useActionState(teacherLogin, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Heslo">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error && <Alert>{state.error}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Přihlašuji…" : "Přihlásit se"}
      </Button>
    </form>
  );
}
