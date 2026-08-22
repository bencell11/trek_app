"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { calculerCouverture } from "@/lib/materiel";
import { useCurrentUser } from "@/lib/current-user";

export default function MaterielPage() {
  const { id } = useParams<{ id: string }>();
  const trekId = id as Id<"treks">;

  const items = useQuery(api.materiel.listByTrek, { trekId });
  const participants = useQuery(api.participants.listByTrek, { trekId });
  const etapes = useQuery(api.etapes.listWithHebergement, { trekId });
  const presences = useQuery(api.presence.listByTrek, { trekId });

  const createItem = useMutation(api.materiel.create);
  const deleteItem = useMutation(api.materiel.remove);
  const addApport = useMutation(api.materiel.addApport);
  const removeApport = useMutation(api.materiel.removeApport);
  const createParticipant = useMutation(api.participants.create);

  const { nom: monNom } = useCurrentUser();
  const estAdmin = monNom?.trim().toLowerCase() === "ben";
  const monParticipant = monNom
    ? participants?.find((p) => p.nom.trim().toLowerCase() === monNom.trim().toLowerCase())
    : undefined;

  const [form, setForm] = useState({
    nom: "",
    categorie: "",
    quantite: "1",
    etapeId: "",
    notes: "",
    estAbri: false,
    capacitePersonnes: "2",
    pourQui: "",
  });

  async function ensureParticipantId(participantIdChoisi?: string): Promise<Id<"participants"> | null> {
    if (participantIdChoisi) {
      const existant = participants?.find((p) => p._id === participantIdChoisi);
      return existant ? (existant._id as Id<"participants">) : null;
    }
    if (!monNom) return null;
    if (monParticipant) return monParticipant._id;
    return await createParticipant({ trekId, nom: monNom });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    const participantId = await ensureParticipantId(estAdmin ? form.pourQui || undefined : undefined);
    if (!participantId) return;

    const quantite = Number(form.quantite) || 1;
    const itemId = await createItem({
      trekId,
      etapeId: form.estAbri ? undefined : form.etapeId ? (form.etapeId as Id<"etapes">) : undefined,
      nom: form.nom.trim(),
      categorie: form.categorie.trim() || undefined,
      quantiteRequise: form.estAbri ? 1 : quantite,
      capacitePersonnes: form.estAbri ? Number(form.capacitePersonnes) || 1 : undefined,
      notes: form.notes.trim() || undefined,
    });
    await addApport({ materielItemId: itemId, participantId, quantite });

    setForm({
      nom: "",
      categorie: "",
      quantite: "1",
      etapeId: "",
      notes: "",
      estAbri: false,
      capacitePersonnes: "2",
      pourQui: "",
    });
  }

  async function jApporteAussi(itemId: Id<"materielItems">) {
    const participantId = await ensureParticipantId();
    if (!participantId) return;
    await addApport({ materielItemId: itemId, participantId, quantite: 1 });
  }

  const presentIdsByEtape = new Map<string, Set<string>>();
  for (const p of presences ?? []) {
    const ids = presentIdsByEtape.get(p.etapeId) ?? new Set<string>();
    ids.add(p.participantId);
    presentIdsByEtape.set(p.etapeId, ids);
  }
  const tousParticipantsIds = new Set((participants ?? []).map((p) => p._id));

  return (
    <div className="h-full overflow-y-auto px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-4">
          {(items ?? []).map((item) => {
            const dejaApporteParMoi =
              !!monParticipant && item.apports.some((a) => a.participantId === monParticipant._id);

            if (item.capacitePersonnes) {
              const placesDisponibles = item.apports.reduce(
                (sum, a) => sum + a.quantite * item.capacitePersonnes!,
                0
              );
              const joursProblematiques = (etapes ?? [])
                .filter((e) => {
                  const present = presentIdsByEtape.get(e._id) ?? new Set<string>();
                  const concerne = item.apports.some((a) => present.has(a.participantId));
                  if (!concerne) return false;
                  return calculerCouverture(item, present).manque > 0;
                })
                .map((e) => `J${e.ordre}`);

              return (
                <div key={item._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.nom}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          🏕 {item.capacitePersonnes} pers./unité
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {placesDisponibles} places dispo — suit les jours de présence de chacun
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          joursProblematiques.length > 0
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {joursProblematiques.length > 0
                          ? `⚠️ manque ${joursProblematiques.join(", ")}`
                          : "✓ couvert"}
                      </span>
                      {estAdmin && (
                        <button
                          type="button"
                          onClick={() => deleteItem({ itemId: item._id })}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Suppr.
                        </button>
                      )}
                    </div>
                  </div>

                  <ul className="mt-2 space-y-1">
                    {item.apports.map((a) => (
                      <li key={a._id} className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {a.participantNom} apporte {a.quantite} ({a.quantite * item.capacitePersonnes!} places)
                        </span>
                        {(a.participantNom === monNom || estAdmin) && (
                          <button
                            type="button"
                            onClick={() => removeApport({ apportId: a._id })}
                            className="text-xs text-slate-400 hover:text-red-600"
                          >
                            retirer
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {!dejaApporteParMoi && monNom && (
                    <button
                      type="button"
                      onClick={() => jApporteAussi(item._id)}
                      className="mt-2 text-xs font-medium text-slate-600 underline hover:text-slate-900"
                    >
                      + Moi aussi j&apos;apporte {item.nom.toLowerCase()}
                    </button>
                  )}
                  {estAdmin && (
                    <ApportForm
                      participants={participants ?? []}
                      onSubmit={(participantId, quantite) =>
                        addApport({ materielItemId: item._id, participantId, quantite })
                      }
                    />
                  )}
                </div>
              );
            }

            const { requis, couvert, manque, unite } = calculerCouverture(item, tousParticipantsIds);
            const enTrop = unite === "" && couvert > requis;
            const statut = manque > 0 ? "manquant" : enTrop ? "double" : "couvert";
            const badgeClass =
              statut === "manquant"
                ? "bg-red-50 text-red-700 border-red-200"
                : statut === "double"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200";

            return (
              <div key={item._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.nom}
                      {item.categorie && (
                        <span className="ml-2 text-xs font-normal text-slate-400">{item.categorie}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.etape ? `Jour ${item.etape.ordre} — ${item.etape.nom}` : "Tout le trek"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                      {couvert}/{requis} {unite} ·{" "}
                      {statut === "manquant" ? "manquant" : statut === "double" ? "en trop" : "couvert"}
                    </span>
                    {estAdmin && (
                      <button
                        type="button"
                        onClick={() => deleteItem({ itemId: item._id })}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Suppr.
                      </button>
                    )}
                  </div>
                </div>

                <ul className="mt-2 space-y-1">
                  {item.apports.map((a) => (
                    <li key={a._id} className="flex items-center justify-between text-sm text-slate-600">
                      <span>
                        {a.participantNom} apporte {a.quantite}
                      </span>
                      {(a.participantNom === monNom || estAdmin) && (
                        <button
                          type="button"
                          onClick={() => removeApport({ apportId: a._id })}
                          className="text-xs text-slate-400 hover:text-red-600"
                        >
                          retirer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>

                {!dejaApporteParMoi && monNom && (
                  <button
                    type="button"
                    onClick={() => jApporteAussi(item._id)}
                    className="mt-2 text-xs font-medium text-slate-600 underline hover:text-slate-900"
                  >
                    + Moi aussi j&apos;apporte {item.nom.toLowerCase()}
                  </button>
                )}
                {estAdmin && (
                  <ApportForm
                    participants={participants ?? []}
                    onSubmit={(participantId, quantite) =>
                      addApport({ materielItemId: item._id, participantId, quantite })
                    }
                  />
                )}
              </div>
            );
          })}
          {items && items.length === 0 && (
            <p className="text-sm text-slate-500">Aucun matériel déclaré pour l&apos;instant.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {estAdmin ? "Ajouter du matériel" : "Ce que j'apporte"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Déclare un objet et il est directement rattaché à toi{estAdmin ? " (ou à qui tu choisis)" : ""} — pour
            un abri, il couvre automatiquement tous tes jours de présence.
          </p>
          <form onSubmit={handleCreate} className="mt-4 grid grid-cols-2 gap-3">
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              required
              placeholder="ex: Tente 2 places"
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              placeholder="Catégorie (abri, cuisine, sécurité...)"
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.estAbri}
                onChange={(e) => setForm({ ...form, estAbri: e.target.checked })}
              />
              C&apos;est un abri (tente...) — le besoin se calcule depuis le nombre de participants
            </label>

            {form.estAbri ? (
              <input
                type="number"
                min={1}
                value={form.capacitePersonnes}
                onChange={(e) => setForm({ ...form, capacitePersonnes: e.target.value })}
                placeholder="Capacité (personnes/unité)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            ) : (
              <select
                value={form.etapeId}
                onChange={(e) => setForm({ ...form, etapeId: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Tout le trek</option>
                {(etapes ?? []).map((e) => (
                  <option key={e._id} value={e._id}>
                    Jour {e.ordre} — {e.nom}
                  </option>
                ))}
              </select>
            )}
            <input
              type="number"
              min={1}
              value={form.quantite}
              onChange={(e) => setForm({ ...form, quantite: e.target.value })}
              placeholder="Quantité que j'apporte"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            {estAdmin && (
              <select
                value={form.pourQui}
                onChange={(e) => setForm({ ...form, pourQui: e.target.value })}
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Pour moi ({monNom})</option>
                {(participants ?? []).map((p) => (
                  <option key={p._id} value={p._id}>
                    Pour {p.nom}
                  </option>
                ))}
              </select>
            )}

            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes"
              rows={2}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="col-span-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Ajouter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ApportForm({
  participants,
  onSubmit,
}: {
  participants: { _id: Id<"participants">; nom: string }[];
  onSubmit: (participantId: Id<"participants">, quantite: number) => void;
}) {
  const [participantId, setParticipantId] = useState("");
  const [quantite, setQuantite] = useState("1");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!participantId) return;
        onSubmit(participantId as Id<"participants">, Number(quantite) || 1);
        setParticipantId("");
        setQuantite("1");
      }}
      className="mt-3 flex items-center gap-2"
    >
      <select
        value={participantId}
        onChange={(e) => setParticipantId(e.target.value)}
        required
        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
      >
        <option value="">Ajouter pour quelqu&apos;un d&apos;autre…</option>
        {participants.map((p) => (
          <option key={p._id} value={p._id}>
            {p.nom}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        value={quantite}
        onChange={(e) => setQuantite(e.target.value)}
        className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
      >
        Ajouter
      </button>
    </form>
  );
}
