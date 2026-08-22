"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCurrentUser } from "@/lib/current-user";

export default function TreksPage() {
  const treks = useQuery(api.treks.list);
  const createTrek = useMutation(api.treks.create);
  const { nom, setNom } = useCurrentUser();

  const [form, setForm] = useState({
    nom: "",
    sectionViaAlpina: "",
    dateDebut: "",
    dateFin: "",
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    await createTrek({
      nom: form.nom.trim(),
      sectionViaAlpina: form.sectionViaAlpina.trim() || undefined,
      dateDebut: form.dateDebut || undefined,
      dateFin: form.dateFin || undefined,
      description: form.description.trim() || undefined,
    });
    setForm({
      nom: "",
      sectionViaAlpina: "",
      dateDebut: "",
      dateFin: "",
      description: "",
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Mes treks</h1>
        <button
          type="button"
          onClick={() => {
            const next = window.prompt("Ton prénom ?", nom ?? "");
            if (next?.trim()) setNom(next.trim());
          }}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          👋 {nom}
        </button>
      </div>

      <ul className="mt-6 space-y-3">
        {(treks ?? []).map((trek) => (
          <li key={trek._id}>
            <Link
              href={`/treks/${trek._id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
            >
              <p className="font-medium text-slate-900">{trek.nom}</p>
              {trek.sectionViaAlpina && (
                <p className="text-sm text-slate-500">
                  {trek.sectionViaAlpina}
                </p>
              )}
              {(trek.dateDebut || trek.dateFin) && (
                <p className="mt-1 text-xs text-slate-400">
                  {trek.dateDebut ?? "?"} → {trek.dateFin ?? "?"}
                </p>
              )}
            </Link>
          </li>
        ))}
        {treks && treks.length === 0 && (
          <p className="text-sm text-slate-500">
            Aucun trek pour l&apos;instant. Crée le premier ci-dessous.
          </p>
        )}
      </ul>

      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Nouveau trek
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Nom
            </label>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Via Alpina – Tronçon 3"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Section Via Alpina
            </label>
            <input
              value={form.sectionViaAlpina}
              onChange={(e) =>
                setForm({ ...form, sectionViaAlpina: e.target.value })
              }
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
                value={form.dateDebut}
                onChange={(e) =>
                  setForm({ ...form, dateDebut: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Date fin
              </label>
              <input
                type="date"
                value={form.dateFin}
                onChange={(e) =>
                  setForm({ ...form, dateFin: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
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
