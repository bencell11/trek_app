"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCurrentUser } from "@/lib/current-user";

export default function TreksPage() {
  const router = useRouter();
  const treks = useQuery(api.treks.list);
  const createTrek = useMutation(api.treks.create);
  const deleteTrek = useMutation(api.treks.remove);
  const { nom, setNom } = useCurrentUser();

  const [nomTrek, setNomTrek] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState({
    sectionViaAlpina: "",
    dateDebut: "",
    dateFin: "",
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nomTrek.trim()) return;
    const id = await createTrek({
      nom: nomTrek.trim(),
      sectionViaAlpina: details.sectionViaAlpina.trim() || undefined,
      dateDebut: details.dateDebut || undefined,
      dateFin: details.dateFin || undefined,
      description: details.description.trim() || undefined,
    });
    router.push(`/treks/${id}/carte`);
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
          <li key={trek._id} className="group relative">
            <Link
              href={`/treks/${trek._id}/carte`}
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
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Supprimer "${trek.nom}" et tout son contenu ?`)) {
                  deleteTrek({ trekId: trek._id });
                }
              }}
              className="absolute right-3 top-3 hidden text-xs text-slate-400 hover:text-red-600 group-hover:block"
            >
              Supprimer
            </button>
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
          <div className="flex gap-2">
            <input
              required
              autoFocus
              value={nomTrek}
              onChange={(e) => setNomTrek(e.target.value)}
              placeholder="Nom du trek"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Créer
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs text-slate-400 underline hover:text-slate-700"
          >
            {showDetails ? "Masquer les détails" : "+ Détails (dates, description...)"}
          </button>

          {showDetails && (
            <div className="space-y-3 pt-1">
              <input
                value={details.sectionViaAlpina}
                onChange={(e) =>
                  setDetails({ ...details, sectionViaAlpina: e.target.value })
                }
                placeholder="Section Via Alpina (optionnel)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={details.dateDebut}
                  onChange={(e) =>
                    setDetails({ ...details, dateDebut: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <input
                  type="date"
                  value={details.dateFin}
                  onChange={(e) =>
                    setDetails({ ...details, dateFin: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <textarea
                value={details.description}
                onChange={(e) =>
                  setDetails({ ...details, description: e.target.value })
                }
                placeholder="Description (optionnel)"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
