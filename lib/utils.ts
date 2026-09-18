/** Spojí třídy a vynechá falsy hodnoty. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "–";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(value: number) {
  return `${Math.round(value)} %`;
}

/** Skloňování: 1 otázka, 2 otázky, 5 otázek. */
export function plural(n: number, forms: [string, string, string]) {
  const abs = Math.abs(n);
  if (abs === 1) return `${n} ${forms[0]}`;
  if (abs >= 2 && abs <= 4) return `${n} ${forms[1]}`;
  return `${n} ${forms[2]}`;
}
