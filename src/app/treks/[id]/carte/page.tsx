"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { TrekEtapeSurCarte } from "@/components/ViaAlpinaCarte";
import viaAlpina from "@/data/via-alpina-ch.json";
import { estimerDureeH, formatDureeH, type ViaAlpinaStage } from "@/lib/via-alpina";
import CommentsThread from "@/components/CommentsThread";

const catalog = viaAlpina.stages as ViaAlpinaStage[];

const ViaAlpinaCarte = dynamic(() => import("@/components/ViaAlpinaCarte"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[550px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-400">
      Chargement de la carte…
    </div>
  ),
});

export default function CartePage() {
  const { id } = useParams<{ id: string }>();
  const trekId = id as Id<"treks">;

  const etapes = useQuery(api.etapes.listWithHebergement, { trekId });
  const presences = useQuery(api.presence.listByTrek, { trekId });
  const participants = useQuery(api.participants.listByTrek, { trekId });

  const createEtape = useMutation(api.etapes.create);
  const deleteEtape = useMutation(api.etapes.remove);
  const upsertHebergement = useMutation(api.hebergements.upsert);

  const [selectedEtapeId, setSelectedEtapeId] = useState<string | null>(null);
  const [selectedStageRef, setSelectedStageRef] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  if (!etapes || !presences || !participants) {
    return (
      <div className="flex h-[550px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-400">
        Chargement…
      </div>
    );
  }

  const participantsById = new Map(participants.map((p) => [p._id, p.nom]));
  const presenceByEtape = new Map<string, string[]>();
  for (const p of presences) {
    const list = presenceByEtape.get(p.etapeId) ?? [];
    list.push(participantsById.get(p.participantId) ?? "?");
    presenceByEtape.set(p.etapeId, list);
  }

  const etapesSurCarte: TrekEtapeSurCarte[] = etapes.map((e) => ({
    id: e._id,
    ordre: e.ordre,
    nom: e.nom,
    distanceKm: e.distanceKm,
    denivelePositif: e.denivelePositif,
    deniveleNegatif: e.deniveleNegatif,
    dureeEstimeeH: e.dureeEstimeeH,
    trace: e.trace,
    viaAlpinaRef: e.viaAlpinaRef,
    hebergementNom: e.hebergement?.nom ?? null,
    participantsNoms: presenceByEtape.get(e._id) ?? [],
  }));

  const importedRefs = new Set(etapesSurCarte.map((e) => e.viaAlpinaRef).filter(Boolean));
  const selectedEtape = etapes.find((e) => e._id === selectedEtapeId);
  const selectedStage = catalog.find((s) => s.ref === selectedStageRef);

  function selectEtape(etapeId: string) {
    setSelectedStageRef(null);
    setSelectedEtapeId(etapeId);
  }
  function selectStage(ref: string) {
    setSelectedEtapeId(null);
    setSelectedStageRef(ref);
  }

  async function importerEtape(stage: ViaAlpinaStage) {
    const depart = stage.trace[0];
    const arrivee = stage.trace[stage.trace.length - 1];
    const newId = await createEtape({
      trekId,
      nom: stage.nom,
      pointDepart: stage.depart,
      pointArrivee: stage.arrivee,
      distanceKm: stage.distanceKm,
      denivelePositif: stage.denivelePositif,
      deniveleNegatif: stage.deniveleNegatif,
      pointDepartLat: depart[0],
      pointDepartLng: depart[1],
      pointArriveeLat: arrivee[0],
      pointArriveeLng: arrivee[1],
      trace: stage.trace,
      viaAlpinaRef: stage.ref,
    });
    setSelectedStageRef(null);
    setSelectedEtapeId(newId);
  }

  return (
    <div className="space-y-4">
      <ViaAlpinaCarte
        catalog={catalog}
        etapes={etapesSurCarte}
        selectedEtapeId={selectedEtapeId}
        onSelectEtape={selectEtape}
        selectedStageRef={selectedStageRef}
        onSelectStage={selectStage}
      />
      <p className="text-xs text-slate-400">
        Tracé complet de la Via Alpina suisse (Vaduz → Montreux) : © contributeurs
        OpenStreetMap (ODbL). Fond de carte : © swisstopo. Durées et dénivelés non
        officiels indiqués comme estimations.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Mon itinéraire</h2>
          <ol className="mt-3 space-y-1">
            {etapes.map((e) => (
              <li key={e._id}>
                <button
                  type="button"
                  onClick={() => selectEtape(e._id)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                    e._id === selectedEtapeId
                      ? "bg-slate-900 text-white"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  J{e.ordre} — {e.nom}
                </button>
              </li>
            ))}
            {etapes.length === 0 && (
              <p className="text-sm text-slate-400">
                Aucune étape. Clique une ligne grise sur la carte pour importer
                une étape officielle.
              </p>
            )}
          </ol>

          <button
            type="button"
            onClick={() => setShowManualForm((v) => !v)}
            className="mt-4 text-sm text-slate-500 underline hover:text-slate-800"
          >
            {showManualForm ? "Annuler" : "+ Étape manuelle (hors tracé)"}
          </button>

          {showManualForm && (
            <ManualEtapeForm
              trekId={trekId}
              onCreated={(newId) => {
                setShowManualForm(false);
                setSelectedEtapeId(newId);
              }}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {selectedEtape && (
            <EtapeDetailPanel
              etape={selectedEtape}
              participantsNoms={presenceByEtape.get(selectedEtape._id) ?? []}
              onDelete={async () => {
                await deleteEtape({ etapeId: selectedEtape._id });
                setSelectedEtapeId(null);
              }}
              onSaveHebergement={(data) =>
                upsertHebergement({ etapeId: selectedEtape._id, ...data })
              }
            />
          )}

          {!selectedEtape && selectedStage && (
            <StageDetailPanel
              stage={selectedStage}
              dejaImportee={importedRefs.has(selectedStage.ref)}
              onImport={() => importerEtape(selectedStage)}
            />
          )}

          {!selectedEtape && !selectedStage && (
            <p className="text-sm text-slate-400">
              Clique une étape sur la carte ou dans la liste pour voir le détail
              (distance, dénivelé, hébergement, commentaires).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StageDetailPanel({
  stage,
  dejaImportee,
  onImport,
}: {
  stage: ViaAlpinaStage;
  dejaImportee: boolean;
  onImport: () => void;
}) {
  const duree = estimerDureeH(stage.distanceKm, stage.denivelePositif, stage.deniveleNegatif);
  return (
    <div>
      <p className="font-medium text-slate-900">
        Étape officielle {stage.ref} — {stage.nom}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {stage.distanceKm} km · +{stage.denivelePositif}m / -{stage.deniveleNegatif}m · ~
        {formatDureeH(duree)} (estimé)
      </p>
      {dejaImportee ? (
        <p className="mt-4 text-sm text-emerald-700">
          ✓ Déjà dans ton itinéraire.
        </p>
      ) : (
        <button
          type="button"
          onClick={onImport}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Ajouter cette étape à mon itinéraire
        </button>
      )}
    </div>
  );
}

function EtapeDetailPanel({
  etape,
  participantsNoms,
  onDelete,
  onSaveHebergement,
}: {
  etape: {
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
  participantsNoms: string[];
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
    <div className="space-y-4">
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
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {participantsNoms.length > 0
              ? `👥 ${participantsNoms.join(", ")}`
              : "Personne d'inscrit pour l'instant"}
          </p>
        </div>
        <button type="button" onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
          Supprimer
        </button>
      </div>

      <details className="text-sm" open={!!heb}>
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
            onChange={(e) => setHebForm({ ...hebForm, type: e.target.value as typeof hebForm.type })}
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
              setHebForm({ ...hebForm, statutReservation: e.target.value as typeof hebForm.statutReservation })
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="a_faire">À réserver</option>
            <option value="en_cours">Réservation en cours</option>
            <option value="confirme">Confirmé</option>
          </select>
          <input
            value={hebForm.contact}
            onChange={(e) => setHebForm({ ...hebForm, contact: e.target.value })}
            placeholder="Contact / téléphone"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            value={hebForm.prixChf}
            onChange={(e) => setHebForm({ ...hebForm, prixChf: e.target.value })}
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

      <CommentsThread etapeId={etape._id} />
    </div>
  );
}

const emptyManualForm = {
  nom: "",
  pointDepart: "",
  pointArrivee: "",
  date: "",
  distanceKm: "",
  denivelePositif: "",
  deniveleNegatif: "",
  dureeEstimeeH: "",
};

function ManualEtapeForm({
  trekId,
  onCreated,
}: {
  trekId: Id<"treks">;
  onCreated: (id: string) => void;
}) {
  const createEtape = useMutation(api.etapes.create);
  const [form, setForm] = useState(emptyManualForm);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.nom.trim()) return;
        const newId = await createEtape({
          trekId,
          nom: form.nom.trim(),
          pointDepart: form.pointDepart.trim() || undefined,
          pointArrivee: form.pointArrivee.trim() || undefined,
          date: form.date || undefined,
          distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
          denivelePositif: form.denivelePositif ? Number(form.denivelePositif) : undefined,
          deniveleNegatif: form.deniveleNegatif ? Number(form.deniveleNegatif) : undefined,
          dureeEstimeeH: form.dureeEstimeeH ? Number(form.dureeEstimeeH) : undefined,
        });
        setForm(emptyManualForm);
        onCreated(newId);
      }}
      className="mt-3 space-y-2"
    >
      <input
        required
        value={form.nom}
        onChange={(e) => setForm({ ...form, nom: e.target.value })}
        placeholder="Nom de l'étape"
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={form.pointDepart}
          onChange={(e) => setForm({ ...form, pointDepart: e.target.value })}
          placeholder="Départ"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          value={form.pointArrivee}
          onChange={(e) => setForm({ ...form, pointArrivee: e.target.value })}
          placeholder="Arrivée"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.1"
          value={form.distanceKm}
          onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
          placeholder="Distance (km)"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          step="0.5"
          value={form.dureeEstimeeH}
          onChange={(e) => setForm({ ...form, dureeEstimeeH: e.target.value })}
          placeholder="Durée (h)"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          value={form.denivelePositif}
          onChange={(e) => setForm({ ...form, denivelePositif: e.target.value })}
          placeholder="D+ (m)"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          value={form.deniveleNegatif}
          onChange={(e) => setForm({ ...form, deniveleNegatif: e.target.value })}
          placeholder="D- (m)"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        Ajouter
      </button>
    </form>
  );
}
