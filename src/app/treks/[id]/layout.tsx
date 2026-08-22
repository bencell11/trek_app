"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const TABS = [
  { href: "", label: "Vue d'ensemble" },
  { href: "/etapes", label: "Étapes" },
  { href: "/participants", label: "Participants" },
  { href: "/materiel", label: "Matériel" },
];

export default function TrekLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const trekId = id as Id<"treks">;
  const trek = useQuery(api.treks.get, { trekId });

  if (trek === undefined) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-500">Chargement…</main>;
  }

  if (trek === null) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-500">Trek introuvable.</p>
        <Link href="/treks" className="text-sm text-slate-800 underline">
          ← Mes treks
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/treks" className="text-sm text-slate-500 hover:text-slate-800">
        ← Mes treks
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {trek.nom}
      </h1>
      {trek.sectionViaAlpina && (
        <p className="text-sm text-slate-500">{trek.sectionViaAlpina}</p>
      )}

      <nav className="mt-6 flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`/treks/${id}${tab.href}`}
            className="rounded-t-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">{children}</div>
    </main>
  );
}
