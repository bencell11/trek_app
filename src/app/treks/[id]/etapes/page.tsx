"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const emptyForm = {
  nom: "",
  pointDepart: "",
  pointArrivee: "",
  date: "",
  distanceKm: "",
  denivelePositif: "",
  deniveleNegatif: "",
  dureeEstimeeH: "",
};

export default function EtapesPage() {
  const { id } = useParams<{ id: string }>();
  const trekId = id as Id<"treks">;

  const etapes = useQuery(api.etapes.listWithHebergement, { trekId });
  const createEtape = useMutation(api.etapes.create);
  const deleteEtape = useMutation(api.etapes.remove);
  const upsertHebergement = useMutation(api.hebergements.upsert);

  const [form, setForm] = useState(emptyForm);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    await createEtape({
      trekId,
      nom: form.nom.trim(),
      pointDepart: form.pointDepart.trim() || undefined,
      pointArrivee: form.pointArrivee.trim() || undefined,
      date: form.date || undefined,
      distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
      denivelePositif: form.denivelePositif
        ? Number(form.denivelePositif)
        : undefined,
      deniveleNegatif: form.deniveleNegatif
        ? Number(form.deniveleNegatif)
        : undefined,
      dureeEstimeeH: form.dureeEstimeeH ? Number(form.dureeEstimeeH) : undefined,
    });
    setForm(emptyForm);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {(etapes ?? []).map((etape) => (
          <EtapeCard
            key={etape._id}
            etape={etape}
            onDelete={() => deleteEtape({ etapeId: etape._id })}
            onSaveHebergement={(data) =>
              upsertHebergement({ etapeId: etape._id, ...data })
            }
          />
        ))}
        {etapes && etapes.length === 0 && (
          <p className="text-sm text-slate-500">Aucune étape pour l&apos;instant.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Ajouter une étape
        </h2>
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-2 gap-3">
          <input
            required
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            placeholder="Nom de l'étape"
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.pointDepart}
            onChange={(e) => setForm({ ...form, pointDepart: e.target.value })}
            placeholder="Point de départ"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.pointArrivee}
            onChange={(e) => setForm({ ...form, pointArrivee: e.target.value })}
            placeholder="Point d'arrivée"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.1"
            value={form.distanceKm}
            onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
            placeholder="Distance (km)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={form.denivelePositif}
            onChange={(e) =>
              setForm({ ...form, denivelePositif: e.target.value })
            }
            placeholder="D+ (m)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={form.deniveleNegatif}
            onChange={(e) =>
              setForm({ ...form, deniveleNegatif: e.target.value })
            }
            placeholder="D- (m)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.5"
            value={form.dureeEstimeeH}
            onChange={(e) =>
              setForm({ ...form, dureeEstimeeH: e.target.value })
            }
            placeholder="Durée estimée (h)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="col-span-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Ajouter l&apos;étape
          </button>
        </form>
      </div>
    </div>
  );
}

type EtapeAvecHebergement = {
  _id: Id<"etapes">;
  ordre: number;
  nom: string;
  pointDepart?: string;
  pointArrivee?: string;
  date?: string;
  distanceKm?: number;
  denivelePositif?: number;
  deniveleNegatif?: number;
  hebergement: {
    nom: string;
    type: "refuge" | "bivouac" | "hotel" | "autre";
    contact?: string;
    statutReservation: "a_faire" | "en_cours" | "confirme";
    prixChf?: number;
    notes?: string;
  } | null;
};

function EtapeCard({
  etape,
  onDelete,
  onSaveHebergement,
}: {
  etape: EtapeAvecHebergement;
  onDelete: () => void;
  onSaveHebergement: (data: {
    nom: string;
    type: "refuge" | "bivouac" | "hotel" | "autre";
    contact?: string;
    statutReservation: "a_faire" | "en_cours" | "confirme";
    prixChf?: number;
    notes?: string;
  }) => void;
}) {
  const heb = etape.hebergement;
  const [hebForm, setHebForm] = useState({
    nom: heb?.nom ?? "",
    type: heb?.type ?? "refuge",
    contact: heb?.contact ?? "",
    statutReservation: heb?.statutReservation ?? "a_faire",
    prixChf: heb?.prixChf?.toString() ?? "",
    notes: heb?.notes ?? "",
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-slate-900">
            Jour {etape.ordre} — {etape.nom}
          </p>
          <p className="text-sm text-slate-500">
            {etape.pointDepart ?? "?"} → {etape.pointArrivee ?? "?"}
            {etape.distanceKm ? ` · ${etape.distanceKm} km` : ""}
            {etape.denivelePositif ? ` · +${etape.denivelePositif}m` : ""}
            {etape.deniveleNegatif ? ` / -${etape.deniveleNegatif}m` : ""}
            {etape.date ? ` · ${etape.date}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Supprimer
        </button>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-600">
          {heb ? `🏠 ${heb.nom} — modifier` : "Ajouter un hébergement"}
        </summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!hebForm.nom.trim()) return;
            onSaveHebergement({
              nom: hebForm.nom.trim(),
              type: hebForm.type,
              contact: hebForm.contact.trim() || undefined,
              statutReservation: hebForm.statutReservation,
              prixChf: hebForm.prixChf ? Number(hebForm.prixChf) : undefined,
              notes: hebForm.notes.trim() || undefined,
            });
          }}
          className="mt-3 grid grid-cols-2 gap-3"
        >
          <input
            value={hebForm.nom}
            onChange={(e) => setHebForm({ ...hebForm, nom: e.target.value })}
            required
            placeholder="Nom du refuge / lieu de bivouac"
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={hebForm.type}
            onChange={(e) =>
              setHebForm({
                ...hebForm,
                type: e.target.value as typeof hebForm.type,
              })
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="refuge">Refuge</option>
            <option value="bivouac">Bivouac</option>
            <option value="hotel">Hôtel</option>
            <option value="autre">Autre</option>
          </select>
          <select
            value={hebForm.statutReservation}
            onChange={(e) =>
              setHebForm({
                ...hebForm,
                statutReservation: e.target
                  .value as typeof hebForm.statutReservation,
              })
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="a_faire">À réserver</option>
            <option value="en_cours">Réservation en cours</option>
            <option value="confirme">Confirmé</option>
          </select>
          <input
            value={hebForm.contact}
            onChange={(e) =>
              setHebForm({ ...hebForm, contact: e.target.value })
            }
            placeholder="Contact / téléphone"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            value={hebForm.prixChf}
            onChange={(e) =>
              setHebForm({ ...hebForm, prixChf: e.target.value })
            }
            placeholder="Prix (CHF)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={hebForm.notes}
            onChange={(e) => setHebForm({ ...hebForm, notes: e.target.value })}
            placeholder="Notes"
            rows={2}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="col-span-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Enregistrer l&apos;hébergement
          </button>
        </form>
      </details>
    </div>
  );
}
