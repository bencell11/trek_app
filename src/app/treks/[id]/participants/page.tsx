"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const trekId = id as Id<"treks">;

  const participants = useQuery(api.participants.listByTrek, { trekId });
  const etapes = useQuery(api.etapes.listWithHebergement, { trekId });
  const presences = useQuery(api.presence.listByTrek, { trekId });

  const createParticipant = useMutation(api.participants.create);
  const deleteParticipant = useMutation(api.participants.remove);
  const setForTrek = useMutation(api.presence.setForTrek);

  const [form, setForm] = useState({ nom: "", email: "", telephone: "" });
  // Édits locaux pas encore enregistrés : clé -> coché/décoché.
  // Tant qu'une case n'a pas été touchée, son état vient de `presences`.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  const presenceSet = new Set(
    (presences ?? []).map((p) => `${p.etapeId}_${p.participantId}`)
  );

  function isChecked(etapeId: string, participantId: string) {
    const key = `${etapeId}_${participantId}`;
    return overrides.has(key) ? overrides.get(key)! : presenceSet.has(key);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    await createParticipant({
      trekId,
      nom: form.nom.trim(),
      email: form.email.trim() || undefined,
      telephone: form.telephone.trim() || undefined,
    });
    setForm({ nom: "", email: "", telephone: "" });
  }

  function toggle(etapeId: string, participantId: string) {
    const key = `${etapeId}_${participantId}`;
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, !isChecked(etapeId, participantId));
      return next;
    });
  }

  async function savePresence() {
    const allKeys = new Set([...presenceSet, ...overrides.keys()]);
    const rows = Array.from(allKeys)
      .filter((key) => (overrides.has(key) ? overrides.get(key)! : presenceSet.has(key)))
      .map((key) => {
        const [etapeId, participantId] = key.split("_");
        return {
          etapeId: etapeId as Id<"etapes">,
          participantId: participantId as Id<"participants">,
        };
      });
    await setForTrek({ trekId, presences: rows });
    setOverrides(new Map());
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Participants</h2>
        <ul className="mt-3 space-y-2">
          {(participants ?? []).map((p) => (
            <li
              key={p._id}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium text-slate-900">{p.nom}</span>
                {p.email && (
                  <span className="ml-2 text-xs text-slate-400">
                    {p.email}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteParticipant({ participantId: p._id })}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Retirer
              </button>
            </li>
          ))}
          {participants && participants.length === 0 && (
            <p className="text-sm text-slate-500">Aucun participant.</p>
          )}
        </ul>

        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-3 gap-3">
          <input
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            required
            placeholder="Nom"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            placeholder="Téléphone"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="col-span-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Ajouter le participant
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Qui est là, quand ?
        </h2>
        {(!etapes || etapes.length === 0 || !participants || participants.length === 0) ? (
          <p className="mt-3 text-sm text-slate-500">
            Ajoute d&apos;abord des étapes et des participants.
          </p>
        ) : (
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-xs font-medium text-slate-500">
                      Participant
                    </th>
                    {etapes.map((e) => (
                      <th
                        key={e._id}
                        className="p-2 text-center text-xs font-medium text-slate-500"
                      >
                        J{e.ordre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p._id} className="border-t border-slate-100">
                      <td className="p-2 font-medium text-slate-800">
                        {p.nom}
                      </td>
                      {etapes.map((e) => (
                        <td key={e._id} className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked(e._id, p._id)}
                            onChange={() => toggle(e._id, p._id)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={savePresence}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Enregistrer la présence
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
