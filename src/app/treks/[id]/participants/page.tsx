"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/current-user";

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const trekId = id as Id<"treks">;

  const participants = useQuery(api.participants.listByTrek, { trekId });
  const etapes = useQuery(api.etapes.listWithHebergement, { trekId });
  const presences = useQuery(api.presence.listByTrek, { trekId });
  const materielItems = useQuery(api.materiel.listByTrek, { trekId });

  const deleteParticipant = useMutation(api.participants.remove);
  const createParticipant = useMutation(api.participants.create);
  const addPresence = useMutation(api.presence.add);
  const removePresence = useMutation(api.presence.remove);

  const { nom: monNom } = useCurrentUser();
  const estAdmin = monNom?.trim().toLowerCase() === "ben";

  const [nouveauNom, setNouveauNom] = useState("");

  const joursByParticipant = new Map<string, Set<string>>();
  for (const p of presences ?? []) {
    const set = joursByParticipant.get(p.participantId) ?? new Set<string>();
    set.add(p.etapeId);
    joursByParticipant.set(p.participantId, set);
  }

  const materielByParticipant = new Map<
    string,
    { nom: string; quantite: number; capacitePersonnes?: number }[]
  >();
  for (const item of materielItems ?? []) {
    for (const a of item.apports) {
      const list = materielByParticipant.get(a.participantId) ?? [];
      list.push({ nom: item.nom, quantite: a.quantite, capacitePersonnes: item.capacitePersonnes });
      materielByParticipant.set(a.participantId, list);
    }
  }

  async function toggleJour(participantId: string, etapeId: string) {
    const present = joursByParticipant.get(participantId)?.has(etapeId) ?? false;
    if (present) {
      await removePresence({ etapeId: etapeId as Id<"etapes">, participantId: participantId as Id<"participants"> });
    } else {
      await addPresence({ etapeId: etapeId as Id<"etapes">, participantId: participantId as Id<"participants"> });
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Participants</h2>

        {(participants ?? []).map((p) => {
          const peuxEditer = p.nom === monNom || estAdmin;
          const jours = joursByParticipant.get(p._id) ?? new Set<string>();
          const materiel = materielByParticipant.get(p._id) ?? [];

          return (
            <div key={p._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{p.nom}</p>
                {peuxEditer && (
                  <button
                    type="button"
                    onClick={() => deleteParticipant({ participantId: p._id })}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Retirer
                  </button>
                )}
              </div>

              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jours</p>
                {!etapes || etapes.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-400">Aucune étape pour l&apos;instant.</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {etapes.map((e) => {
                      const present = jours.has(e._id);
                      return (
                        <button
                          key={e._id}
                          type="button"
                          disabled={!peuxEditer}
                          onClick={() => toggleJour(p._id, e._id)}
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                            present
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 text-slate-400"
                          } ${peuxEditer ? "hover:opacity-80" : "cursor-default"}`}
                        >
                          J{e.ordre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matériel</p>
                {materiel.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-400">Rien de déclaré.</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-700">
                    {materiel
                      .map(
                        (m) =>
                          `${m.nom} ×${m.quantite}${m.capacitePersonnes ? ` (${m.capacitePersonnes} pers./unité)` : ""}`
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {participants && participants.length === 0 && (
          <p className="text-sm text-slate-500">
            Personne pour l&apos;instant — chacun est ajouté automatiquement en marquant sa présence sur une étape.
          </p>
        )}

        {estAdmin && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!nouveauNom.trim()) return;
              await createParticipant({ trekId, nom: nouveauNom.trim() });
              setNouveauNom("");
            }}
            className="flex gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-3"
          >
            <input
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              placeholder="Ajouter quelqu'un (nom)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Ajouter
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
