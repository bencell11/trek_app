"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type {
  HebergementSurCarte,
  PointInteretSurCarte,
  PointInteretType,
  TrekEtapeSurCarte,
} from "@/components/ViaAlpinaCarte";
import viaAlpina from "@/data/via-alpina-ch.json";
import {
  decimateTrace,
  distanceTrace,
  estimerDureeH,
  formatDureeH,
  splitTraceAtDistance,
  type ViaAlpinaStage,
} from "@/lib/via-alpina";
import { calculerCouverture } from "@/lib/materiel";
import CommentsThread from "@/components/CommentsThread";
import { useCurrentUser } from "@/lib/current-user";

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
  dureeEstimeeH?: number;
  hebergement: {
    nom: string;
    type: "refuge" | "bivouac" | "hotel" | "autre";
    contact?: string;
    statutReservation: "a_faire" | "en_cours" | "confirme";
    prixChf?: number;
    notes?: string;
  } | null;
};

type MaterielItemAvecManque = {
  _id: Id<"materielItems">;
  nom: string;
  quantiteRequise: number;
  capacitePersonnes?: number;
  etapeId?: Id<"etapes">;
  apports: {
    _id: Id<"materielApports">;
    quantite: number;
    participantId: Id<"participants">;
    participantNom: string;
  }[];
  couvert: number;
  requis: number;
  manque: number;
  unite: "places" | "";
};

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
  const calculerProfil = useAction(api.elevation.profil);
  const upsertHebergement = useMutation(api.hebergements.upsert);
  const createPoint = useMutation(api.pointsInteret.create);
  const deletePoint = useMutation(api.pointsInteret.remove);
  const createParticipant = useMutation(api.participants.create);
  const addPresence = useMutation(api.presence.add);
  const removePresence = useMutation(api.presence.remove);
  const { nom: monNom } = useCurrentUser();

  const [selectedEtapeId, setSelectedEtapeId] = useState<string | null>(null);
  const [selectedStageRef, setSelectedStageRef] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [placingPoint, setPlacingPoint] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(true);
  const [panneauReduit, setPanneauReduit] = useState(false);

  if (!etapes || !presences || !participants || !materielItems || !points) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
        Chargement…
      </div>
    );
  }

  const participantsById = new Map(participants.map((p) => [p._id, p.nom]));
  const presenceByEtape = new Map<string, string[]>();
  const presentIdsByEtape = new Map<string, Set<string>>();
  for (const p of presences) {
    const list = presenceByEtape.get(p.etapeId) ?? [];
    list.push(participantsById.get(p.participantId) ?? "?");
    presenceByEtape.set(p.etapeId, list);

    const ids = presentIdsByEtape.get(p.etapeId) ?? new Set<string>();
    ids.add(p.participantId);
    presentIdsByEtape.set(p.etapeId, ids);
  }

  const monParticipant = monNom
    ? participants.find((p) => p.nom.trim().toLowerCase() === monNom.trim().toLowerCase())
    : undefined;

  async function toggleMaPresence(etapeId: string) {
    if (!monNom) return;
    const participantId = monParticipant?._id ?? (await createParticipant({ trekId, nom: monNom }));
    const dejaPresent = presentIdsByEtape.get(etapeId)?.has(participantId) ?? false;
    if (dejaPresent) {
      await removePresence({ etapeId: etapeId as Id<"etapes">, participantId });
    } else {
      await addPresence({ etapeId: etapeId as Id<"etapes">, participantId });
    }
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

  // Les abris (tente...) n'ont pas d'étape fixe : ils concernent chacun des
  // jours où au moins un de leurs apporteurs est présent, et leur couverture
  // se recalcule par jour à partir des seuls apporteurs présents ce jour-là.
  const tousParticipantsIds = new Set(participants.map((p) => p._id));

  const manquesGlobal: MaterielItemAvecManque[] = materielItems
    .filter((item) => !item.capacitePersonnes && !item.etapeId)
    .map((item) => ({ ...item, ...calculerCouverture(item, tousParticipantsIds) }))
    .filter((item) => item.manque > 0);

  const materielParEtape = new Map<string, MaterielItemAvecManque[]>();
  for (const etape of etapes) {
    const presentIds = presentIdsByEtape.get(etape._id) ?? new Set<string>();
    const list: MaterielItemAvecManque[] = [];
    for (const item of materielItems) {
      if (item.capacitePersonnes) {
        const concerne = item.apports.some((a) => presentIds.has(a.participantId));
        if (!concerne) continue;
        list.push({ ...item, ...calculerCouverture(item, presentIds) });
      } else if (item.etapeId === etape._id) {
        list.push({ ...item, ...calculerCouverture(item, tousParticipantsIds) });
      }
    }
    materielParEtape.set(etape._id, list);
  }

  const totalDistance = etapes.reduce((s, e) => s + (e.distanceKm ?? 0), 0);
  const totalDPlus = etapes.reduce((s, e) => s + (e.denivelePositif ?? 0), 0);
  const totalDMoins = etapes.reduce((s, e) => s + (e.deniveleNegatif ?? 0), 0);

  const importedRefs = new Set(etapesSurCarte.map((e) => e.viaAlpinaRef).filter(Boolean));
  const selectedStage = catalog.find((s) => s.ref === selectedStageRef);
  const selectedPoint = points.find((p) => p._id === selectedPointId);

  function clearSelection() {
    setSelectedEtapeId(null);
    setSelectedStageRef(null);
    setSelectedPointId(null);
    setPendingPoint(null);
  }
  function selectEtape(etapeId: string) {
    setSelectedStageRef(null);
    setSelectedPointId(null);
    setPendingPoint(null);
    setSelectedEtapeId((prev) => (prev === etapeId ? null : etapeId));
  }
  function selectStage(ref: string) {
    clearSelection();
    setSelectedStageRef(ref);
  }
  function selectPoint(pointId: string) {
    clearSelection();
    setSelectedPointId(pointId);
  }

  async function creerEtapeDepuisTrace(args: {
    nom: string;
    pointDepart: string;
    pointArrivee: string;
    distanceKm: number;
    denivelePositif: number;
    deniveleNegatif: number;
    trace: number[][][];
    viaAlpinaRef: string;
  }) {
    const depart = args.trace[0][0];
    const dernierSegment = args.trace[args.trace.length - 1];
    const arrivee = dernierSegment[dernierSegment.length - 1];
    return await createEtape({
      trekId,
      nom: args.nom,
      pointDepart: args.pointDepart,
      pointArrivee: args.pointArrivee,
      distanceKm: Math.round(args.distanceKm * 10) / 10,
      denivelePositif: args.denivelePositif,
      deniveleNegatif: args.deniveleNegatif,
      pointDepartLat: depart[0],
      pointDepartLng: depart[1],
      pointArriveeLat: arrivee[0],
      pointArriveeLng: arrivee[1],
      trace: args.trace,
      viaAlpinaRef: args.viaAlpinaRef,
    });
  }

  async function importerEtape(stage: ViaAlpinaStage) {
    const newId = await creerEtapeDepuisTrace({
      nom: stage.nom,
      pointDepart: stage.depart,
      pointArrivee: stage.arrivee,
      distanceKm: stage.distanceKm,
      denivelePositif: stage.denivelePositif,
      deniveleNegatif: stage.deniveleNegatif,
      trace: stage.trace,
      viaAlpinaRef: stage.ref,
    });
    clearSelection();
    setSelectedEtapeId(newId);
  }

  async function importerEtapeDivisee(stage: ViaAlpinaStage, fraction: number) {
    // Le tracé stocké est décimé (simplifié pour l'affichage) donc plus
    // court que la vraie distance : on l'utilise seulement pour trouver le
    // point de coupure au bon endroit, pas pour la distance affichée —
    // celle-ci vient de stage.distanceKm (la distance officielle), répartie
    // selon la même fraction, pour que J1 + J2 retombe exactement sur le
    // total d'origine.
    const totalTraceKm = distanceTrace(stage.trace);
    const { traceA, traceB } = splitTraceAtDistance(stage.trace, totalTraceKm * fraction);
    if (traceB.length === 0) return; // coupure hors du tracé, ne devrait pas arriver

    const distA = Math.round(stage.distanceKm * fraction * 10) / 10;
    const distB = Math.round(stage.distanceKm * (1 - fraction) * 10) / 10;
    const pointsA = traceA.flat();
    const pointsB = traceB.flat();
    const pointCoupure = traceA[traceA.length - 1].at(-1) as number[];

    const [profilA, profilB] = await Promise.all([
      calculerProfil({ points: decimateTrace(pointsA, 100) }),
      calculerProfil({ points: decimateTrace(pointsB, 100) }),
    ]);

    const nomCoupure = `${pointCoupure[0].toFixed(4)}, ${pointCoupure[1].toFixed(4)}`;
    const idA = await creerEtapeDepuisTrace({
      nom: `${stage.depart} → bivouac`,
      pointDepart: stage.depart,
      pointArrivee: nomCoupure,
      distanceKm: distA,
      denivelePositif: profilA.gain,
      deniveleNegatif: profilA.loss,
      trace: traceA,
      viaAlpinaRef: stage.ref,
    });
    await creerEtapeDepuisTrace({
      nom: `bivouac → ${stage.arrivee}`,
      pointDepart: nomCoupure,
      pointArrivee: stage.arrivee,
      distanceKm: distB,
      denivelePositif: profilB.gain,
      deniveleNegatif: profilB.loss,
      trace: traceB,
      viaAlpinaRef: stage.ref,
    });
    clearSelection();
    setSelectedEtapeId(idA);
  }

  const rightPanelOuvert = !!(selectedStage || selectedPoint || pendingPoint);

  const carte = (
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
  );

  const itineraire = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Mon itinéraire</h2>
        <button
          type="button"
          onClick={() => setPleinEcran((v) => !v)}
          className="shrink-0 text-xs text-slate-400 underline hover:text-slate-700"
        >
          {pleinEcran ? "Vue classique" : "Carte plein écran"}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {etapes.length} étape{etapes.length > 1 ? "s" : ""} ·{" "}
        {Math.round(totalDistance * 10) / 10} km · +{totalDPlus}m / -{totalDMoins}m ·{" "}
        {participants.length} 👥
      </p>
      {manquesGlobal.length > 0 && (
        <p className="mt-2 text-xs text-amber-800">
          ⚠️ Matériel manquant (tout le trek) : {manquesGlobal.map((i) => i.nom).join(", ")}{" "}
          <Link href={`/treks/${id}/materiel`} className="font-medium underline">
            Voir →
          </Link>
        </p>
      )}

      <div className="mt-3 space-y-2">
        {etapes.map((e) => (
          <EtapeAccordionItem
            key={e._id}
            etape={e}
            expanded={e._id === selectedEtapeId}
            onToggle={() => selectEtape(e._id)}
            participantsNoms={presenceByEtape.get(e._id) ?? []}
            materielEtape={materielParEtape.get(e._id) ?? []}
            jeParticipe={
              !!monParticipant && (presentIdsByEtape.get(e._id)?.has(monParticipant._id) ?? false)
            }
            peuxParticiper={!!monNom}
            onTogglePresence={() => toggleMaPresence(e._id)}
            onDelete={async () => {
              await deleteEtape({ etapeId: e._id });
              clearSelection();
            }}
            onSaveHebergement={(data) => upsertHebergement({ etapeId: e._id, ...data })}
          />
        ))}
        {etapes.length === 0 && (
          <p className="py-3 text-sm text-slate-400">
            Aucune étape. Clique une ligne bleue sur la carte pour importer une
            étape officielle.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowManualForm((v) => !v)}
        className="mt-3 block text-left text-sm text-slate-500 underline hover:text-slate-800"
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
          <h2 className="mt-4 text-sm font-semibold text-slate-900">Points d&apos;intérêt</h2>
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
        className="mt-3 block text-left text-sm text-slate-500 underline hover:text-slate-800 disabled:text-slate-300"
      >
        {placingPoint ? "Clique sur la carte…" : "+ Point d'intérêt (vue, lac...)"}
      </button>
    </>
  );

  const panneauDroit = rightPanelOuvert && (
    <>
      <button
        type="button"
        onClick={clearSelection}
        className="float-right text-slate-400 hover:text-slate-700"
        aria-label="Fermer"
      >
        ✕
      </button>

      {selectedStage && (
        <StageDetailPanel
          stage={selectedStage}
          dejaImportee={importedRefs.has(selectedStage.ref)}
          onImport={() => importerEtape(selectedStage)}
          onImportDivise={(fraction) => importerEtapeDivisee(selectedStage, fraction)}
        />
      )}

      {!selectedStage && selectedPoint && (
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
    </>
  );

  if (!pleinEcran) {
    return (
      <div className="h-full overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {itineraire}
          </div>
          <div className="h-[420px] w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            {carte}
          </div>
          <p className="text-xs text-slate-400">
            Tracé complet de la Via Alpina suisse (Vaduz → Montreux) : © contributeurs
            OpenStreetMap (ODbL). Fond de carte : © swisstopo.
          </p>
          {rightPanelOuvert && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {panneauDroit}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {carte}

      {placingPoint && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1100] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Clique sur la carte pour placer le point
        </div>
      )}

      {/* Panneau flottant gauche : itinéraire (panneau principal), rétractable
          pour laisser voir la carte (barre du bas sur mobile, boîte flottante
          au clavier/souris sur desktop) */}
      {panneauReduit ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1000] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-3 sm:top-3">
          <button
            type="button"
            onClick={() => setPanneauReduit(false)}
            className="pointer-events-auto flex w-full items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg sm:w-auto sm:rounded-full sm:border sm:px-4 sm:py-2"
          >
            <span>☰ Mon itinéraire</span>
            <span className="text-xs font-normal text-slate-400">
              {etapes.length} étape{etapes.length > 1 ? "s" : ""} · ▲
            </span>
          </button>
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1000] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-3 sm:top-3 sm:max-w-[calc(100vw-1.5rem)]">
          <div
            className="pointer-events-auto max-h-[70vh] w-full resize-none overflow-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-lg sm:h-[560px] sm:max-h-[88vh] sm:min-h-[150px] sm:min-w-[260px] sm:w-[380px] sm:max-w-[80vw] sm:resize sm:rounded-xl"
          >
            <button
              type="button"
              onClick={() => setPanneauReduit(true)}
              className="float-right -mr-1 -mt-1 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Réduire pour voir la carte"
            >
              ▾
            </button>
            {itineraire}
          </div>
        </div>
      )}

      {/* Panneau flottant droit : étape officielle à importer / point d'intérêt */}
      {rightPanelOuvert && (
        <div className="pointer-events-none absolute right-3 top-3 z-[1000] max-w-[calc(100vw-1.5rem)]">
          <div
            className="pointer-events-auto resize overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
            style={{
              width: 340,
              height: 320,
              minWidth: 240,
              minHeight: 120,
              maxWidth: "80vw",
              maxHeight: "85vh",
            }}
          >
            {panneauDroit}
          </div>
        </div>
      )}
    </div>
  );
}

function EtapeAccordionItem({
  etape,
  expanded,
  onToggle,
  participantsNoms,
  materielEtape,
  jeParticipe,
  peuxParticiper,
  onTogglePresence,
  onDelete,
  onSaveHebergement,
}: {
  etape: EtapeAvecHebergement;
  expanded: boolean;
  onToggle: () => void;
  participantsNoms: string[];
  materielEtape: MaterielItemAvecManque[];
  jeParticipe: boolean;
  peuxParticiper: boolean;
  onTogglePresence: () => void;
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
  const nbManques = materielEtape.filter((i) => i.manque > 0).length;
  const duree =
    etape.dureeEstimeeH ??
    (etape.distanceKm !== undefined &&
    etape.denivelePositif !== undefined &&
    etape.deniveleNegatif !== undefined
      ? estimerDureeH(etape.distanceKm, etape.denivelePositif, etape.deniveleNegatif)
      : undefined);

  const [hebForm, setHebForm] = useState({
    nom: heb?.nom ?? "",
    type: heb?.type ?? "refuge",
    contact: heb?.contact ?? "",
    statutReservation: heb?.statutReservation ?? "a_faire",
    prixChf: heb?.prixChf?.toString() ?? "",
    notes: heb?.notes ?? "",
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left ${
          expanded ? "bg-slate-50" : "hover:bg-slate-50"
        }`}
      >
        <span className="text-sm font-semibold text-slate-900">
          J{etape.ordre} — {etape.nom}
        </span>
        <span className="shrink-0 text-xs text-slate-400">
          {etape.distanceKm ? `${etape.distanceKm}km` : ""}
          {participantsNoms.length > 0 ? ` · 👥${participantsNoms.length}` : ""}
          {nbManques > 0 ? ` · ⚠️${nbManques}` : ""}
          <span className="ml-1">{expanded ? "▲" : "▼"}</span>
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-3 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {etape.pointDepart ?? "?"} → {etape.pointArrivee ?? "?"}
            </span>
            {etape.distanceKm !== undefined && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                📏 {etape.distanceKm} km
              </span>
            )}
            {etape.denivelePositif !== undefined && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                ↗ +{etape.denivelePositif}m
              </span>
            )}
            {etape.deniveleNegatif !== undefined && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                ↘ -{etape.deniveleNegatif}m
              </span>
            )}
            {duree !== undefined && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                ⏱ ~{formatDureeH(duree)}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                👥 Participants
              </p>
              {peuxParticiper && (
                <button
                  type="button"
                  onClick={onTogglePresence}
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                    jeParticipe
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {jeParticipe ? "✓ Je viens" : "+ Je participe"}
                </button>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {participantsNoms.length > 0 ? (
                participantsNoms.map((nom) => (
                  <span
                    key={nom}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                  >
                    {nom}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">Personne d&apos;inscrit pour l&apos;instant</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              🎒 Matériel
            </p>
            {materielEtape.length === 0 ? (
              <p className="mt-1 text-slate-400">Aucun matériel spécifique à cette étape.</p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {materielEtape.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"
                  >
                    <span className="text-slate-700">
                      <span className="font-medium text-slate-800">{item.nom}</span>
                      {item.apports.length > 0 && (
                        <span className="ml-1.5 text-xs text-slate-400">
                          {item.apports.map((a) => a.participantNom).join(", ")}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                        item.manque > 0
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {item.couvert}/{item.requis} {item.unite}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details open={!!heb}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
              {heb ? `🏠 ${heb.nom} — modifier` : "🏠 Ajouter un hébergement"}
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
              className="mt-2 grid grid-cols-2 gap-2"
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

          <div>
            <CommentsThread etapeId={etape._id} />
          </div>

          <div>
            <button type="button" onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
              Supprimer l&apos;étape
            </button>
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
  onImportDivise,
}: {
  stage: ViaAlpinaStage;
  dejaImportee: boolean;
  onImport: () => void;
  onImportDivise: (fraction: number) => Promise<void>;
}) {
  const duree = estimerDureeH(stage.distanceKm, stage.denivelePositif, stage.deniveleNegatif);
  const [diviser, setDiviser] = useState(false);
  const [fraction, setFraction] = useState(0.5);
  const [enCours, setEnCours] = useState(false);

  const distA = Math.round(stage.distanceKm * fraction * 10) / 10;
  const distB = Math.round(stage.distanceKm * (1 - fraction) * 10) / 10;

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
        <p className="mt-4 text-sm text-emerald-700">✓ Déjà dans ton itinéraire.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={onImport}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Ajouter cette étape à mon itinéraire
          </button>

          <button
            type="button"
            onClick={() => setDiviser((v) => !v)}
            className="mt-2 block text-sm text-slate-500 underline hover:text-slate-800"
          >
            {diviser ? "Annuler la division" : "Trop long ? Diviser en 2 jours avec bivouac"}
          </button>

          {diviser && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <input
                type="range"
                min={10}
                max={90}
                value={Math.round(fraction * 100)}
                onChange={(e) => setFraction(Number(e.target.value) / 100)}
                className="w-full"
              />
              <p className="mt-2 text-xs text-slate-600">
                Jour 1 : {distA} km — bivouac — Jour 2 : {distB} km
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Le dénivelé de chaque moitié est recalculé depuis le relief réel.
              </p>
              <button
                type="button"
                disabled={enCours}
                onClick={async () => {
                  setEnCours(true);
                  await onImportDivise(fraction);
                  setEnCours(false);
                }}
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {enCours ? "Calcul du dénivelé…" : "Diviser et ajouter les 2 étapes"}
              </button>
            </div>
          )}
        </>
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
