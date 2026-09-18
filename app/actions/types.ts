/** Návratový stav server actions používaných s useActionState. */
export type ActionState = { error?: string; success?: string } | undefined;

export function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function intOrNull(formData: FormData, key: string) {
  const v = str(formData, key);
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
