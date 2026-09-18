import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Alert({
  tone = "danger",
  children,
  className,
}: {
  tone?: "danger" | "success" | "warning" | "info";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    danger: "bg-danger-bg text-danger-fg",
    success: "bg-success-bg text-success-fg",
    warning: "bg-warning-bg text-warning-fg",
    info: "bg-sky text-text",
  };
  return (
    <div role="alert" className={cn("rounded-xl px-4 py-3 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
