"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const TABS = [
  { href: "/carte", label: "Carte" },
  { href: "/participants", label: "Participants" },
  { href: "/materiel", label: "Matériel" },
];

export default function TrekLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const trekId = id as Id<"treks">;
  const trek = useQuery(api.treks.get, { trekId });

  if (trek === undefined) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Chargement…
      </div>
    );
  }

  if (trek === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2">
        <p className="text-sm text-slate-500">Trek introuvable.</p>
        <Link href="/treks" className="text-sm text-slate-800 underline">
          ← Mes treks
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-4 py-2">
        <Link href="/treks" className="text-sm text-slate-500 hover:text-slate-800">
          ← Mes treks
        </Link>
        <h1 className="text-base font-semibold text-slate-900">{trek.nom}</h1>
        <nav className="ml-auto flex gap-1">
          {TABS.map((tab) => {
            const active = pathname === `/treks/${id}${tab.href}`;
            return (
              <Link
                key={tab.href}
                href={`/treks/${id}${tab.href}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
