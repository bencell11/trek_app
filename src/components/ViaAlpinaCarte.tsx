"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ReactNode, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression, PathOptions } from "leaflet";
import type { ViaAlpinaStage } from "@/lib/via-alpina";
import { estimerDureeH, formatDureeH } from "@/lib/via-alpina";

export type TrekEtapeSurCarte = {
  id: string;
  ordre: number;
  nom: string;
  distanceKm?: number;
  denivelePositif?: number;
  deniveleNegatif?: number;
  dureeEstimeeH?: number;
  // Un tableau de segments : un tracé peut être coupé en plusieurs
  // morceaux quand les données source ne sont pas continues (pas de faux
  // trait "à vol d'oiseau" pour combler le trou).
  trace?: number[][][];
  viaAlpinaRef?: string;
  hebergementNom?: string | null;
  participantsNoms: string[];
};

export type HebergementSurCarte = {
  etapeId: string;
  nom: string;
  type: "refuge" | "bivouac" | "hotel" | "autre";
  statutReservation: "a_faire" | "en_cours" | "confirme";
  contact?: string;
  prixChf?: number;
  notes?: string;
  lat: number;
  lng: number;
};

export type PointInteretType = "point_de_vue" | "lac" | "source" | "sommet" | "autre";

export type PointInteretSurCarte = {
  id: string;
  nom: string;
  type: PointInteretType;
  lat: number;
  lng: number;
  notes?: string;
};

const EMOJI_POI: Record<PointInteretType, string> = {
  point_de_vue: "🔭",
  lac: "💧",
  source: "⛲",
  sommet: "⛰️",
  autre: "📍",
};

function emojiIcon(emoji: string, taille = 26) {
  return L.divIcon({
    html: `<div style="font-size:${taille}px;line-height:1;transform:translate(-50%,-50%)">${emoji}</div>`,
    className: "",
    iconSize: [0, 0],
  });
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    // MapContainer is loaded via next/dynamic and swapped in after a
    // loading placeholder, so Leaflet's cached container size can be
    // stale on first fit — invalidateSize() forces it to re-measure.
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [map, bounds]);
  return null;
}

function ClicPourPlacer({ actif, onClick }: { actif: boolean; onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (actif) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MetricsLine({
  distanceKm,
  denivelePositif,
  deniveleNegatif,
  dureeEstimeeH,
}: {
  distanceKm?: number;
  denivelePositif?: number;
  deniveleNegatif?: number;
  dureeEstimeeH?: number;
}) {
  const duree =
    dureeEstimeeH ??
    (distanceKm !== undefined && denivelePositif !== undefined && deniveleNegatif !== undefined
      ? estimerDureeH(distanceKm, denivelePositif, deniveleNegatif)
      : undefined);
  return (
    <p>
      {distanceKm !== undefined ? `${distanceKm} km` : "distance ?"}
      {denivelePositif !== undefined ? ` · +${denivelePositif}m` : ""}
      {deniveleNegatif !== undefined ? ` / -${deniveleNegatif}m` : ""}
      {duree !== undefined ? ` · ~${formatDureeH(duree)}` : ""}
    </p>
  );
}

/** Renders one trace (possibly several disconnected segments) as a set of
 * polylines sharing the same style/click behaviour, each with a wider
 * invisible twin underneath for easier clicking. */
function SegmentedPolyline({
  segments,
  pathOptions,
  onClick,
  tooltip,
}: {
  segments: number[][][];
  pathOptions: PathOptions;
  onClick: () => void;
  tooltip?: ReactNode;
}) {
  return (
    <>
      {segments.map((segment, i) => (
        <div key={i}>
          <Polyline
            positions={segment as LatLngExpression[]}
            pathOptions={{ color: "#000", weight: 20, opacity: 0 }}
            eventHandlers={{ click: onClick }}
          />
          <Polyline
            positions={segment as LatLngExpression[]}
            pathOptions={pathOptions}
            eventHandlers={{ click: onClick }}
          >
            {tooltip && (
              <Tooltip direction="top" sticky>
                {tooltip}
              </Tooltip>
            )}
          </Polyline>
        </div>
      ))}
    </>
  );
}

export default function ViaAlpinaCarte({
  catalog,
  etapes,
  hebergements,
  pointsInteret,
  selectedEtapeId,
  onSelectEtape,
  selectedStageRef,
  onSelectStage,
  selectedPointId,
  onSelectPoint,
  placingPoint,
  onMapClickForPoint,
}: {
  catalog: ViaAlpinaStage[];
  etapes: TrekEtapeSurCarte[];
  hebergements: HebergementSurCarte[];
  pointsInteret: PointInteretSurCarte[];
  selectedEtapeId: string | null;
  onSelectEtape: (id: string) => void;
  selectedStageRef: string | null;
  onSelectStage: (ref: string) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string) => void;
  placingPoint: boolean;
  onMapClickForPoint: (lat: number, lng: number) => void;
}) {
  const importedRefs = useMemo(
    () => new Set(etapes.map((e) => e.viaAlpinaRef).filter(Boolean) as string[]),
    [etapes]
  );

  const etapesAvecTrace = etapes.filter((e) => e.trace && e.trace.length > 0);
  const catalogNonImporte = catalog.filter((s) => !importedRefs.has(s.ref));

  const selectedEtape = etapes.find((e) => e.id === selectedEtapeId);
  const selectedStage = catalog.find((s) => s.ref === selectedStageRef);

  const bounds: LatLngBoundsExpression | null = (() => {
    const asTuples = (segments: number[][][]) =>
      segments.flatMap((seg) => seg.map((p) => [p[0], p[1]] as [number, number]));
    if (selectedEtape?.trace) return asTuples(selectedEtape.trace);
    if (selectedStage) return asTuples(selectedStage.trace);
    if (etapesAvecTrace.length > 0) {
      return etapesAvecTrace.flatMap((e) => asTuples(e.trace as number[][][]));
    }
    return catalog.flatMap((s) => asTuples(s.trace));
  })();

  return (
    <MapContainer
      center={[46.6, 8.5]}
      zoom={8}
      scrollWheelZoom
      zoomControl={false}
      className={`h-full w-full ${placingPoint ? "cursor-crosshair" : ""}`}
    >
      <ZoomControl position="bottomleft" />
      <TileLayer
        attribution='&copy; <a href="https://www.swisstopo.admin.ch">swisstopo</a>'
        url="https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg"
        maxZoom={18}
      />

      {/* Étapes officielles pas encore dans le trek : cliquables pour prévisualiser/importer */}
      {catalogNonImporte.map((stage) => (
        <SegmentedPolyline
          key={stage.ref}
          segments={stage.trace}
          onClick={() => onSelectStage(stage.ref)}
          pathOptions={{
            color: stage.ref === selectedStageRef ? "#f59e0b" : "#2563eb",
            weight: stage.ref === selectedStageRef ? 6 : 4,
            opacity: stage.ref === selectedStageRef ? 1 : 0.85,
          }}
          tooltip={
            <div className="text-xs">
              <p className="font-semibold">
                Étape {stage.ref} — {stage.nom}
              </p>
              <MetricsLine
                distanceKm={stage.distanceKm}
                denivelePositif={stage.denivelePositif}
                deniveleNegatif={stage.deniveleNegatif}
              />
              <p className="italic text-slate-500">Clique pour l&apos;ajouter à ton itinéraire</p>
            </div>
          }
        />
      ))}

      {/* Étapes du trek (importées ou avec tracé) : en surbrillance */}
      {etapesAvecTrace.map((etape) => {
        const segments = etape.trace as number[][][];
        const plusLongSegment = segments.reduce((a, b) => (b.length > a.length ? b : a));
        const milieu = plusLongSegment[Math.floor(plusLongSegment.length / 2)] as LatLngExpression;
        const selected = etape.id === selectedEtapeId;
        const tooltipContent = (
          <div className="text-xs">
            <p className="font-semibold">
              Jour {etape.ordre} — {etape.nom}
            </p>
            <MetricsLine
              distanceKm={etape.distanceKm}
              denivelePositif={etape.denivelePositif}
              deniveleNegatif={etape.deniveleNegatif}
              dureeEstimeeH={etape.dureeEstimeeH}
            />
            {etape.hebergementNom && <p>🏠 {etape.hebergementNom}</p>}
            <p>
              {etape.participantsNoms.length > 0
                ? `👥 ${etape.participantsNoms.join(", ")}`
                : "Personne d'inscrit"}
            </p>
          </div>
        );
        return (
          <div key={etape.id}>
            <SegmentedPolyline
              segments={segments}
              onClick={() => onSelectEtape(etape.id)}
              pathOptions={{
                color: selected ? "#f59e0b" : "#0f172a",
                weight: selected ? 6 : 4,
                opacity: 0.95,
              }}
              tooltip={tooltipContent}
            />
            <CircleMarker
              center={milieu}
              radius={selected ? 9 : 7}
              pathOptions={{
                color: "#0f172a",
                fillColor: selected ? "#f59e0b" : "#22c55e",
                fillOpacity: 1,
                weight: 2,
              }}
              eventHandlers={{ click: () => onSelectEtape(etape.id) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {tooltipContent}
              </Tooltip>
            </CircleMarker>
          </div>
        );
      })}

      {/* Hébergements : infos consultables au survol, sans avoir à ouvrir l'étape */}
      {hebergements.map((h) => (
        <Marker
          key={h.etapeId}
          position={[h.lat, h.lng]}
          icon={emojiIcon("🏠")}
          eventHandlers={{ click: () => onSelectEtape(h.etapeId) }}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <div className="text-xs">
              <p className="font-semibold">{h.nom}</p>
              <p className="capitalize">{h.type}</p>
              {h.contact && <p>📞 {h.contact}</p>}
              {h.prixChf !== undefined && <p>{h.prixChf} CHF</p>}
              <p>
                {h.statutReservation === "confirme"
                  ? "✅ réservé"
                  : h.statutReservation === "en_cours"
                    ? "⏳ réservation en cours"
                    : "❌ à réserver"}
              </p>
              {h.notes && <p className="italic text-slate-500">{h.notes}</p>}
            </div>
          </Tooltip>
        </Marker>
      ))}

      {/* Points d'intérêt (points de vue, lacs, sommets...) */}
      {pointsInteret.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={emojiIcon(EMOJI_POI[p.type], p.id === selectedPointId ? 32 : 24)}
          eventHandlers={{ click: () => onSelectPoint(p.id) }}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <div className="text-xs">
              <p className="font-semibold">
                {EMOJI_POI[p.type]} {p.nom}
              </p>
              {p.notes && <p>{p.notes}</p>}
            </div>
          </Tooltip>
        </Marker>
      ))}

      <ClicPourPlacer actif={placingPoint} onClick={onMapClickForPoint} />
      <FitBounds bounds={bounds} />
    </MapContainer>
  );
}
