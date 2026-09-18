"use client";

import { Input, Select } from "@/components/ui/input";
import type { AnswerValue, PublicQuestion } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

const optionClass =
  "flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-base transition-colors hover:border-primary has-checked:border-primary has-checked:bg-primary-soft";

export function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: PublicQuestion;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}) {
  switch (question.type) {
    case "single":
      return (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label key={i} className={optionClass}>
              <input
                type="radio"
                name={question.id}
                className="h-4 w-4 accent-[var(--primary)]"
                checked={value === i}
                onChange={() => onChange(i)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );

    case "multi": {
      const selected = Array.isArray(value) ? (value as number[]) : [];
      return (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label key={i} className={optionClass}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={selected.includes(i)}
                onChange={(e) =>
                  onChange(e.target.checked ? [...selected, i].sort((a, b) => a - b) : selected.filter((x) => x !== i))
                }
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    case "boolean":
      return (
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: true, label: "Pravda" },
            { v: false, label: "Nepravda" },
          ].map(({ v, label }) => (
            <label key={label} className={cn(optionClass, "justify-center")}>
              <input
                type="radio"
                name={question.id}
                className="h-4 w-4 accent-[var(--primary)]"
                checked={value === v}
                onChange={() => onChange(v)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      );

    case "text":
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder ?? "Tvoje odpověď…"}
          autoComplete="off"
        />
      );

    case "matching": {
      const chosen = Array.isArray(value) ? (value as (number | null)[]) : question.lefts.map(() => null);
      return (
        <div className="space-y-2">
          {question.lefts.map((left, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-border bg-surface px-4 py-3 sm:grid-cols-2 sm:items-center">
              <span className="font-medium">{left}</span>
              <Select
                value={chosen[i] ?? ""}
                onChange={(e) => {
                  const next = [...chosen];
                  next[i] = e.target.value === "" ? null : Number(e.target.value);
                  onChange(next);
                }}
              >
                <option value="">— vyber —</option>
                {question.rights.map((r, ri) => (
                  <option key={ri} value={ri}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      );
    }
  }
}
