"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export default function MaterielPage() {
  const { id } = useParams<{ id: string }>();
  const trekId = id as Id<"treks">;

  const items = useQuery(api.materiel.listByTrek, { trekId });
  const participants = useQuery(api.participants.listByTrek, { trekId });
  const etapes = useQuery(api.etapes.listWithHebergement, { trekId });

  const createItem = useMutation(api.materiel.create);
  const deleteItem = useMutation(api.materiel.remove);
  const addApport = useMutation(api.materiel.addApport);
  const removeApport = useMutation(api.materiel.removeApport);

  const [form, setForm] = useState({
    nom: "",
    categorie: "",
    quantiteRequise: "1",
    etapeId: "",
    notes: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    await createItem({
      trekId,
      etapeId: form.etapeId ? (form.etapeId as Id<"etapes">) : undefined,
      nom: form.nom.trim(),
      categorie: form.categorie.trim() || undefined,
      quantiteRequise: Number(form.quantiteRequise) || 1,
      notes: form.notes.trim() || undefined,
    });
    setForm({ nom: "", categorie: "", quantiteRequise: "1", etapeId: "", notes: "" });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {(items ?? []).map((item) => {
          const totalApporte = item.apports.reduce((s, a) => s + a.quantite, 0);
          const diff = totalApporte - item.quantiteRequise;
          const statut = diff < 0 ? "manquant" : diff > 0 ? "double" : "couvert";
          const badgeClass =
            statut === "manquant"
              ? "bg-red-50 text-red-700 border-red-200"
              : statut === "double"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200";

          return (
            <div
              key={item._id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {item.nom}
                    {item.categorie && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {item.categorie}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.etape
                      ? `Jour ${item.etape.ordre} — ${item.etape.nom}`
                      : "Tout le trek"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                  >
                    {totalApporte}/{item.quantiteRequise} ·{" "}
                    {statut === "manquant"
                      ? "manquant"
                      : statut === "double"
                        ? "en trop"
                        : "couvert"}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteItem({ itemId: item._id })}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Suppr.
                  </button>
                </div>
              </div>

              <ul className="mt-2 space-y-1">
                {item.apports.map((a) => (
                  <li
                    key={a._id}
                    className="flex items-center justify-between text-sm text-slate-600"
                  >
                    <span>
                      {a.participantNom} apporte {a.quantite}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeApport({ apportId: a._id })}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      retirer
                    </button>
                  </li>
                ))}
              </ul>

              {participants && participants.length > 0 && (
                <ApportForm
                  participants={participants}
                  onSubmit={(participantId, quantite) =>
                    addApport({
                      materielItemId: item._id,
                      participantId,
                      quantite,
                    })
                  }
                />
              )}
            </div>
          );
        })}
        {items && items.length === 0 && (
          <p className="text-sm text-slate-500">
            Aucun item de matériel pour l&apos;instant.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Ajouter un item de matériel
        </h2>
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
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={form.quantiteRequise}
            onChange={(e) =>
              setForm({ ...form, quantiteRequise: e.target.value })
            }
            placeholder="Quantité requise"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.etapeId}
            onChange={(e) => setForm({ ...form, etapeId: e.target.value })}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tout le trek</option>
            {(etapes ?? []).map((e) => (
              <option key={e._id} value={e._id}>
                Jour {e.ordre} — {e.nom}
              </option>
            ))}
          </select>
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
            Ajouter l&apos;item
          </button>
        </form>
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
        <option value="">Qui apporte ?</option>
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
