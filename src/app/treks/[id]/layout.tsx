import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TABS = [
  { href: "", label: "Vue d'ensemble" },
  { href: "/etapes", label: "Étapes" },
  { href: "/participants", label: "Participants" },
  { href: "/materiel", label: "Matériel" },
];

export default async function TrekLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: trek } = await supabase
    .from("treks")
    .select("*")
    .eq("id", id)
    .single();

  if (!trek) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/treks" className="text-sm text-slate-500 hover:text-slate-800">
        ← Mes treks
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {trek.nom}
      </h1>
      {trek.section_via_alpina && (
        <p className="text-sm text-slate-500">{trek.section_via_alpina}</p>
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
