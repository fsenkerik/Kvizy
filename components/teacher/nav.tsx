"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function TeacherNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/ucitel", label: "Skupiny", active: pathname === "/ucitel" || /^\/ucitel\/(skupiny|tridy|temata|kvizy|pokusy)/.test(pathname) },
    ...(isAdmin ? [{ href: "/ucitel/ucitele", label: "Učitelé", active: pathname.startsWith("/ucitel/ucitele") }] : []),
    { href: "/ucitel/profil", label: "Profil", active: pathname.startsWith("/ucitel/profil") },
  ];
  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            item.active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-text",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
