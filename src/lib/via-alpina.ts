export type ViaAlpinaStage = {
  ref: string;
  nom: string;
  depart: string;
  arrivee: string;
  distanceKm: number;
  denivelePositif: number;
  deniveleNegatif: number;
  trace: number[][];
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
