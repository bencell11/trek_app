"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type {
  HebergementSurCarte,
  PointInteretSurCarte,
  PointInteretType,
  TrekEtapeSurCarte,
} from "@/components/ViaAlpinaCarte";
import viaAlpina from "@/data/via-alpina-ch.json";
import { estimerDureeH, formatDureeH, type ViaAlpinaStage } from "@/lib/via-alpina";
import CommentsThread from "@/components/CommentsThread";

const catalog = viaAlpina.stages as ViaAlpinaStage[];

const EMOJI_POI: Record<PointInteretType, string> = {
  point_de_vue: "🔭",
  lac: "💧",
  source: "⛲",
  sommet: "⛰️",
  autre: "📍",
};
const LABEL_POI: Record<PointInteretType, string> = {
  point_de_vue: "Point de vue",
  lac: "Lac",
  source: "Source",
  sommet: "Sommet",
  autre: "Autre",
};

const ViaAlpinaCarte = dynamic(() => import("@/components/ViaAlpinaCarte"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
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
  const materielItems = useQuery(api.materiel.listByTrek, { trekId });
  const points = useQuery(api.pointsInteret.listByTrek, { trekId });

  const createEtape = useMutation(api.etapes.create);
  const deleteEtape = useMutation(api.etapes.remove);
  const upsertHebergement = useMutation(api.hebergements.upsert);
  const createPoint = useMutation(api.pointsInteret.create);
  const deletePoint = useMutation(api.pointsInteret.remove);

  const [selectedEtapeId, setSelectedEtapeId] = useState<string | null>(null);
  const [selectedStageRef, setSelectedStageRef] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [placingPoint, setPlacingPoint] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [resumeOuvert, setResumeOuvert] = useState(false);

  if (!etapes || !presences || !participants || !points) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
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

  const hebergementsSurCarte: HebergementSurCarte[] = etapes
    .filter((e) => e.hebergement && e.pointArriveeLat !== undefined && e.pointArriveeLng !== undefined)
    .map((e) => ({
      etapeId: e._id,
      nom: e.hebergement!.nom,
      type: e.hebergement!.type,
      statutReservation: e.hebergement!.statutReservation,
      contact: e.hebergement!.contact,
      prixChf: e.hebergement!.prixChf,
      notes: e.hebergement!.notes,
      lat: e.pointArriveeLat as number,
      lng: e.pointArriveeLng as number,
    }));

  const pointsSurCarte: PointInteretSurCarte[] = points.map((p) => ({
    id: p._id,
    nom: p.nom,
    type: p.type,
    lat: p.lat,
    lng: p.lng,
    notes: p.notes,
  }));

  const materielAvecManque = (materielItems ?? []).map((item) => {
    const apporte = item.apports.reduce((sum, a) => sum + a.quantite, 0);
    return { ...item, apporte, manque: item.quantiteRequise - apporte };
  });
  const manquesGlobal = materielAvecManque.filter(
    (item) => item.manque > 0 && !item.etapeId
  );
  const manquesParEtape = new Map<string, number>();
  for (const item of materielAvecManque) {
    if (item.etapeId && item.manque > 0) {
      manquesParEtape.set(item.etapeId, (manquesParEtape.get(item.etapeId) ?? 0) + 1);
    }
  }

  const totalDistance = etapes.reduce((s, e) => s + (e.distanceKm ?? 0), 0);
  const totalDPlus = etapes.reduce((s, e) => s + (e.denivelePositif ?? 0), 0);
  const totalDMoins = etapes.reduce((s, e) => s + (e.deniveleNegatif ?? 0), 0);
  const totalManques = manquesGlobal.length + manquesParEtape.size;

  const importedRefs = new Set(etapesSurCarte.map((e) => e.viaAlpinaRef).filter(Boolean));
  const selectedEtape = etapes.find((e) => e._id === selectedEtapeId);
  const selectedStage = catalog.find((s) => s.ref === selectedStageRef);
  const selectedPoint = points.find((p) => p._id === selectedPointId);

  function clearSelection() {
    setSelectedEtapeId(null);
    setSelectedStageRef(null);
    setSelectedPointId(null);
    setPendingPoint(null);
  }
  function selectEtape(etapeId: string) {
    clearSelection();
    setSelectedEtapeId(etapeId);
  }
  function selectStage(ref: string) {
    clearSelection();
    setSelectedStageRef(ref);
  }
  function selectPoint(pointId: string) {
    clearSelection();
    setSelectedPointId(pointId);
  }

  async function importerEtape(stage: ViaAlpinaStage) {
    const depart = stage.trace[0][0];
    const dernierSegment = stage.trace[stage.trace.length - 1];
    const arrivee = dernierSegment[dernierSegment.length - 1];
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
    clearSelection();
    setSelectedEtapeId(newId);
  }

  const detailPanelOuvert = !!(selectedEtape || selectedStage || selectedPoint || pendingPoint);

  return (
    <div className="relative h-full w-full">
      <ViaAlpinaCarte
        catalog={catalog}
        etapes={etapesSurCarte}
        hebergements={hebergementsSurCarte}
        pointsInteret={pointsSurCarte}
        selectedEtapeId={selectedEtapeId}
        onSelectEtape={selectEtape}
        selectedStageRef={selectedStageRef}
        onSelectStage={selectStage}
        selectedPointId={selectedPointId}
        onSelectPoint={selectPoint}
        placingPoint={placingPoint}
        onMapClickForPoint={(lat, lng) => {
          clearSelection();
          setPendingPoint({ lat, lng });
          setPlacingPoint(false);
        }}
      />

      {placingPoint && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1100] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Clique sur la carte pour placer le point
        </div>
      )}

      {/* Colonne flottante gauche : résumé + itinéraire + points d'intérêt */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex max-w-[calc(100vw-1.5rem)] flex-col gap-3">
        <div className="pointer-events-auto w-[340px] max-w-[calc(100vw-1.5rem)] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => setResumeOuvert((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-slate-900">Résumé</span>
            <span className="text-xs text-slate-500">
              {etapes.length} ét. · {Math.round(totalDistance * 10) / 10} km ·{" "}
              {participants.length} 👥
              {totalManques > 0 ? ` · ⚠️ ${totalManques}` : ""}
              <span className="ml-1">{resumeOuvert ? "▲" : "▼"}</span>
            </span>
          </button>
          {resumeOuvert && (
            <div className="max-h-64 overflow-y-auto border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                +{totalDPlus}m / -{totalDMoins}m au total
              </p>
              {manquesGlobal.length > 0 && (
                <p className="mt-2 text-xs text-amber-800">
                  ⚠️ Manque (tout le trek) : {manquesGlobal.map((i) => i.nom).join(", ")}{" "}
                  <Link href={`/treks/${id}/materiel`} className="font-medium underline">
                    Voir →
                  </Link>
                </p>
              )}
              {etapes.length > 0 && (
                <table className="mt-2 w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="pb-1 pr-2 font-medium">Étape</th>
                      <th className="pb-1 pr-2 font-medium">Distance</th>
                      <th className="pb-1 pr-2 font-medium">👥</th>
                      <th className="pb-1 font-medium">Matériel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {etapes.map((e) => {
                      const nbManques = manquesParEtape.get(e._id) ?? 0;
                      const noms = presenceByEtape.get(e._id) ?? [];
                      return (
                        <tr
                          key={e._id}
                          onClick={() => selectEtape(e._id)}
                          className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-1 pr-2 text-slate-800">
                            J{e.ordre} — {e.nom}
                          </td>
                          <td className="py-1 pr-2 text-slate-500">
                            {e.distanceKm ? `${e.distanceKm} km` : "?"}
                          </td>
                          <td className="py-1 pr-2 text-slate-500">
                            {noms.length > 0 ? noms.length : "—"}
                          </td>
                          <td className="py-1">
                            {nbManques > 0 ? (
                              <span className="text-amber-700">⚠️ {nbManques}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div
          className="pointer-events-auto resize overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
          style={{
            width: 340,
            height: 420,
            minWidth: 240,
            minHeight: 120,
            maxWidth: "80vw",
            maxHeight: "85vh",
          }}
        >
          <h2 className="text-sm font-semibold text-slate-900">Mon itinéraire</h2>
          <ol className="mt-2 space-y-1">
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
                Aucune étape. Clique une ligne bleue sur la carte pour importer
                une étape officielle.
              </p>
            )}
          </ol>
          <button
            type="button"
            onClick={() => setShowManualForm((v) => !v)}
            className="mt-3 text-left text-sm text-slate-500 underline hover:text-slate-800"
          >
            {showManualForm ? "Annuler" : "+ Étape manuelle (hors tracé)"}
          </button>
          {showManualForm && (
            <ManualEtapeForm
              trekId={trekId}
              onCreated={(newId) => {
                setShowManualForm(false);
                selectEtape(newId);
              }}
            />
          )}

          {points.length > 0 && (
            <>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">
                Points d&apos;intérêt
              </h2>
              <ol className="mt-2 space-y-1">
                {points.map((p) => (
                  <li key={p._id}>
                    <button
                      type="button"
                      onClick={() => selectPoint(p._id)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                        p._id === selectedPointId
                          ? "bg-slate-900 text-white"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {EMOJI_POI[p.type]} {p.nom}
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              clearSelection();
              setPlacingPoint(true);
            }}
            disabled={placingPoint}
            className="mt-3 text-left text-sm text-slate-500 underline hover:text-slate-800 disabled:text-slate-300"
          >
            {placingPoint ? "Clique sur la carte…" : "+ Point d'intérêt (vue, lac...)"}
          </button>
        </div>
      </div>

      {/* Panneau flottant droit : détail de la sélection */}
      {detailPanelOuvert && (
        <div className="pointer-events-none absolute right-3 top-3 z-[1000] max-w-[calc(100vw-1.5rem)]">
          <div
            className="pointer-events-auto resize overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
            style={{
              width: 360,
              height: 480,
              minWidth: 260,
              minHeight: 120,
              maxWidth: "80vw",
              maxHeight: "85vh",
            }}
          >
            <button
              type="button"
              onClick={clearSelection}
              className="float-right text-slate-400 hover:text-slate-700"
              aria-label="Fermer"
            >
              ✕
            </button>

            {selectedEtape && (
              <EtapeDetailPanel
                etape={selectedEtape}
                participantsNoms={presenceByEtape.get(selectedEtape._id) ?? []}
                onDelete={async () => {
                  await deleteEtape({ etapeId: selectedEtape._id });
                  clearSelection();
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

            {!selectedEtape && !selectedStage && selectedPoint && (
              <PointDetailPanel
                point={selectedPoint}
                onDelete={async () => {
                  await deletePoint({ pointId: selectedPoint._id });
                  clearSelection();
                }}
              />
            )}

            {pendingPoint && (
              <NewPointForm
                lat={pendingPoint.lat}
                lng={pendingPoint.lng}
                onCancel={clearSelection}
                onCreate={async (nom, type) => {
                  const newId = await createPoint({
                    trekId,
                    nom,
                    type,
                    lat: pendingPoint.lat,
                    lng: pendingPoint.lng,
                  });
                  setPendingPoint(null);
                  setSelectedPointId(newId);
                }}
              />
            )}
          </div>
        </div>
      )}
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

function PointDetailPanel({
  point,
  onDelete,
}: {
  point: { nom: string; type: PointInteretType; notes?: string };
  onDelete: () => void;
}) {
  return (
    <div>
      <p className="font-medium text-slate-900">
        {EMOJI_POI[point.type]} {point.nom}
      </p>
      <p className="text-sm text-slate-500">{LABEL_POI[point.type]}</p>
      {point.notes && <p className="mt-2 text-sm text-slate-600">{point.notes}</p>}
      <button
        type="button"
        onClick={onDelete}
        className="mt-4 text-xs text-red-500 hover:text-red-700"
      >
        Supprimer
      </button>
    </div>
  );
}

function NewPointForm({
  lat,
  lng,
  onCreate,
  onCancel,
}: {
  lat: number;
  lng: number;
  onCreate: (nom: string, type: PointInteretType) => void;
  onCancel: () => void;
}) {
  const [nom, setNom] = useState("");
  const [type, setType] = useState<PointInteretType>("point_de_vue");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nom.trim()) return;
        onCreate(nom.trim(), type);
      }}
    >
      <p className="font-medium text-slate-900">Nouveau point d&apos;intérêt</p>
      <p className="text-xs text-slate-400">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </p>
      <input
        autoFocus
        required
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Nom (ex: Vue sur le glacier)"
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PointInteretType)}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        {(Object.keys(LABEL_POI) as PointInteretType[]).map((t) => (
          <option key={t} value={t}>
            {EMOJI_POI[t]} {LABEL_POI[t]}
          </option>
        ))}
      </select>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-800"
        >
          Annuler
        </button>
      </div>
    </form>
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

      <button
        type="button"
        onClick={onDelete}
        className="text-xs text-red-500 hover:text-red-700"
      >
        Supprimer l&apos;étape
      </button>
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
