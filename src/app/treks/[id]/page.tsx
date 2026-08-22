"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export default function TrekOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const trekId = id as Id<"treks">;

  const etapes = useQuery(api.etapes.listWithHebergement, { trekId });
  const presences = useQuery(api.presence.listByTrek, { trekId });
  const participants = useQuery(api.participants.listByTrek, { trekId });
  const materielItems = useQuery(api.materiel.listByTrek, { trekId });

  const participantsById = new Map(
    (participants ?? []).map((p) => [p._id, p.nom])
  );

  const presenceByEtape = new Map<string, string[]>();
  for (const p of presences ?? []) {
    const list = presenceByEtape.get(p.etapeId) ?? [];
    list.push(participantsById.get(p.participantId) ?? "?");
    presenceByEtape.set(p.etapeId, list);
  }

  const manques = (materielItems ?? [])
    .map((item) => {
      const apporte = item.apports.reduce((sum, a) => sum + a.quantite, 0);
      return { ...item, apporte, manque: item.quantiteRequise - apporte };
    })
    .filter((item) => item.manque > 0);

  return (
    <div className="space-y-8">
      {manques.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            ⚠️ Matériel manquant ({manques.length})
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {manques.map((item) => (
              <li key={item._id}>
                {item.nom} — {item.apporte}/{item.quantiteRequise}
              </li>
            ))}
          </ul>
          <Link
            href={`/treks/${id}/materiel`}
            className="mt-3 inline-block text-sm font-medium text-amber-900 underline"
          >
            Voir le détail du matériel →
          </Link>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Itinéraire</h2>
          <Link
            href={`/treks/${id}/carte`}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Voir la carte →
          </Link>
        </div>

        {etapes && etapes.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Aucune étape définie. Commence par ajouter le jour 1.
          </p>
        )}

        <ol className="mt-4 space-y-3">
          {(etapes ?? []).map((etape) => {
            const noms = presenceByEtape.get(etape._id) ?? [];
            return (
              <li
                key={etape._id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">
                    Jour {etape.ordre} — {etape.nom}
                  </p>
                  {etape.date && (
                    <span className="text-xs text-slate-400">
                      {etape.date}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {etape.pointDepart ?? "?"} → {etape.pointArrivee ?? "?"}
                  {etape.distanceKm ? ` · ${etape.distanceKm} km` : ""}
                  {etape.denivelePositif ? ` · +${etape.denivelePositif}m` : ""}
                </p>
                {etape.hebergement && (
                  <p className="mt-1 text-sm text-slate-600">
                    🏠 {etape.hebergement.nom}{" "}
                    <span className="text-xs text-slate-400">
                      ({etape.hebergement.type} ·{" "}
                      {etape.hebergement.statutReservation === "confirme"
                        ? "réservé"
                        : etape.hebergement.statutReservation === "en_cours"
                          ? "réservation en cours"
                          : "à réserver"}
                      )
                    </span>
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {noms.length === 0
                    ? "Personne d'inscrit pour l'instant"
                    : `👥 ${noms.join(", ")}`}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
