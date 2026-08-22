import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTrek, signOut } from "./actions";

export default async function TreksPage() {
  const supabase = await createClient();
  const { data: treks } = await supabase
    .from("treks")
    .select("*")
    .order("date_debut", { ascending: true, nullsFirst: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Mes treks</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Se déconnecter
          </button>
        </form>
      </div>

      <ul className="mt-6 space-y-3">
        {(treks ?? []).map((trek) => (
          <li key={trek.id}>
            <Link
              href={`/treks/${trek.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
            >
              <p className="font-medium text-slate-900">{trek.nom}</p>
              {trek.section_via_alpina && (
                <p className="text-sm text-slate-500">
                  {trek.section_via_alpina}
                </p>
              )}
              {(trek.date_debut || trek.date_fin) && (
                <p className="mt-1 text-xs text-slate-400">
                  {trek.date_debut ?? "?"} → {trek.date_fin ?? "?"}
                </p>
              )}
            </Link>
          </li>
        ))}
        {(!treks || treks.length === 0) && (
          <p className="text-sm text-slate-500">
            Aucun trek pour l&apos;instant. Crée le premier ci-dessous.
          </p>
        )}
      </ul>

      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Nouveau trek
        </h2>
        <form action={createTrek} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Nom
            </label>
            <input
              name="nom"
              required
              placeholder="Via Alpina – Tronçon 3"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Section Via Alpina
            </label>
            <input
              name="section_via_alpina"
              placeholder="ex: Route rouge, étapes 12-16"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Date début
              </label>
              <input
                type="date"
                name="date_debut"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Date fin
              </label>
              <input
                type="date"
                name="date_fin"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Créer le trek
          </button>
        </form>
      </div>
    </main>
  );
}
