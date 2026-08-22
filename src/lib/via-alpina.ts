export type ViaAlpinaStage = {
  ref: string;
  nom: string;
  depart: string;
  arrivee: string;
  distanceKm: number;
  denivelePositif: number;
  deniveleNegatif: number;
  // Un tableau de segments (pas une seule ligne) : quand le tracé OSM de
  // l'étape n'est pas continu, on évite de relier les morceaux par un faux
  // trait "à vol d'oiseau".
  trace: number[][][];
};

// Estimation de la durée de marche à partir de la distance et du dénivelé,
// sur le modèle des formules utilisées par les cartes de randonnée suisses
// (proche de SchweizMobil / CAS) : environ 4km/h à plat, +1h par 400m de
// montée, +1h par 800m de descente. C'est une estimation, pas une mesure.
export function estimerDureeH(
  distanceKm: number,
  denivelePositif: number,
  deniveleNegatif: number
): number {
  const heures = distanceKm / 4 + denivelePositif / 400 + deniveleNegatif / 800;
  return Math.round(heures * 2) / 2;
}

export function formatDureeH(heures: number): string {
  const h = Math.floor(heures);
  const m = Math.round((heures - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function haversineKm(a: number[], b: number[]): number {
  const R = 6371;
  const [lat1, lon1] = [(a[0] * Math.PI) / 180, (a[1] * Math.PI) / 180];
  const [lat2, lon2] = [(b[0] * Math.PI) / 180, (b[1] * Math.PI) / 180];
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function distanceTrace(trace: number[][][]): number {
  let total = 0;
  for (const run of trace) {
    for (let i = 1; i < run.length; i++) total += haversineKm(run[i - 1], run[i]);
  }
  return total;
}

/**
 * Coupe un tracé (potentiellement en plusieurs segments) à une distance
 * donnée depuis le départ, en interpolant le point de coupure. Utilisé
 * pour diviser une étape officielle trop longue en deux jours.
 */
export function splitTraceAtDistance(
  trace: number[][][],
  targetKm: number
): { traceA: number[][][]; traceB: number[][][] } {
  let cum = 0;
  const runsA: number[][][] = [];
  const runsB: number[][][] = [];
  let split = false;

  for (const run of trace) {
    if (split) {
      runsB.push(run);
      continue;
    }
    if (run.length < 2) {
      runsA.push(run);
      continue;
    }
    const runA: number[][] = [run[0]];
    for (let i = 1; i < run.length; i++) {
      const segKm = haversineKm(run[i - 1], run[i]);
      if (cum + segKm >= targetKm) {
        const frac = segKm === 0 ? 0 : (targetKm - cum) / segKm;
        const interp = [
          run[i - 1][0] + (run[i][0] - run[i - 1][0]) * frac,
          run[i - 1][1] + (run[i][1] - run[i - 1][1]) * frac,
        ];
        runA.push(interp);
        runsA.push(runA);
        runsB.push([interp, ...run.slice(i)]);
        split = true;
        break;
      }
      cum += segKm;
      runA.push(run[i]);
    }
    if (!split) runsA.push(runA);
  }

  if (!split) return { traceA: trace, traceB: [] };
  return { traceA: runsA, traceB: runsB };
}

/** Réduit le nombre de points d'un tracé (pour limiter la taille des
 * requêtes d'altitude), en gardant toujours le premier et le dernier. */
export function decimateTrace(points: number[][], cible = 100): number[][] {
  if (points.length <= cible) return points;
  const step = points.length / cible;
  const idx = Array.from(new Set(Array.from({ length: cible }, (_, i) => Math.floor(i * step))));
  if (idx[idx.length - 1] !== points.length - 1) idx.push(points.length - 1);
  return idx.map((i) => points[i]);
}
