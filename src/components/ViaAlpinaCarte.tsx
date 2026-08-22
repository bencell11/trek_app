"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
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
  trace?: number[][];
  viaAlpinaRef?: string;
  hebergementNom?: string | null;
  participantsNoms: string[];
};

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

export default function ViaAlpinaCarte({
  catalog,
  etapes,
  selectedEtapeId,
  onSelectEtape,
  selectedStageRef,
  onSelectStage,
}: {
  catalog: ViaAlpinaStage[];
  etapes: TrekEtapeSurCarte[];
  selectedEtapeId: string | null;
  onSelectEtape: (id: string) => void;
  selectedStageRef: string | null;
  onSelectStage: (ref: string) => void;
}) {
  const importedRefs = useMemo(
    () => new Set(etapes.map((e) => e.viaAlpinaRef).filter(Boolean) as string[]),
    [etapes]
  );

  const etapesAvecTrace = etapes.filter((e) => e.trace && e.trace.length > 1);
  const catalogNonImporte = catalog.filter((s) => !importedRefs.has(s.ref));

  const selectedEtape = etapes.find((e) => e.id === selectedEtapeId);
  const selectedStage = catalog.find((s) => s.ref === selectedStageRef);

  const bounds: LatLngBoundsExpression | null = (() => {
    const asTuples = (t: number[][]) => t.map((p) => [p[0], p[1]] as [number, number]);
    if (selectedEtape?.trace) return asTuples(selectedEtape.trace);
    if (selectedStage) return asTuples(selectedStage.trace);
    if (etapesAvecTrace.length > 0) {
      return etapesAvecTrace.flatMap((e) => asTuples(e.trace as number[][]));
    }
    return catalog.flatMap((s) => asTuples(s.trace));
  })();

  return (
    <MapContainer center={[46.6, 8.5]} zoom={8} scrollWheelZoom className="h-[550px] w-full rounded-xl">
      <TileLayer
        attribution='&copy; <a href="https://www.swisstopo.admin.ch">swisstopo</a>'
        url="https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg"
        maxZoom={18}
      />

      {/* Étapes officielles pas encore dans le trek : cliquables pour prévisualiser/importer */}
      {catalogNonImporte.map((stage) => (
        <div key={stage.ref}>
          {/* Ligne invisible plus large : zone de clic plus facile à viser */}
          <Polyline
            positions={stage.trace as LatLngExpression[]}
            pathOptions={{ color: "#000", weight: 20, opacity: 0 }}
            eventHandlers={{ click: () => onSelectStage(stage.ref) }}
          />
          <Polyline
            positions={stage.trace as LatLngExpression[]}
            pathOptions={{
              color: stage.ref === selectedStageRef ? "#f59e0b" : "#2563eb",
              weight: stage.ref === selectedStageRef ? 6 : 4,
              opacity: stage.ref === selectedStageRef ? 1 : 0.85,
            }}
            eventHandlers={{ click: () => onSelectStage(stage.ref) }}
          >
            <Tooltip direction="top" sticky>
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
            </Tooltip>
          </Polyline>
        </div>
      ))}

      {/* Étapes du trek (importées ou avec tracé) : en surbrillance */}
      {etapesAvecTrace.map((etape) => {
        const trace = etape.trace as LatLngExpression[];
        const milieu = trace[Math.floor(trace.length / 2)];
        const selected = etape.id === selectedEtapeId;
        return (
          <div key={etape.id}>
            <Polyline
              positions={trace}
              pathOptions={{ color: "#000", weight: 20, opacity: 0 }}
              eventHandlers={{ click: () => onSelectEtape(etape.id) }}
            />
            <Polyline
              positions={trace}
              pathOptions={{
                color: selected ? "#f59e0b" : "#0f172a",
                weight: selected ? 6 : 4,
                opacity: 0.95,
              }}
              eventHandlers={{ click: () => onSelectEtape(etape.id) }}
            >
              <Tooltip direction="top" sticky>
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
              </Tooltip>
            </Polyline>
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
              </Tooltip>
            </CircleMarker>
          </div>
        );
      })}

      <FitBounds bounds={bounds} />
    </MapContainer>
  );
}
