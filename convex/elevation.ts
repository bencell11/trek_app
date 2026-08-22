import { v } from "convex/values";
import { action } from "./_generated/server";

// Approximation WGS84 -> CH1903+/LV95 (formule officielle swisstopo).
function wgs84ToLv95(lat: number, lon: number): [number, number] {
  const latSec = lat * 3600;
  const lonSec = lon * 3600;
  const latAux = (latSec - 169028.66) / 10000;
  const lonAux = (lonSec - 26782.5) / 10000;
  const y =
    600072.37 +
    211455.93 * lonAux -
    10938.51 * lonAux * latAux -
    0.36 * lonAux * latAux ** 2 -
    44.54 * lonAux ** 3;
  const x =
    200147.07 +
    308807.95 * latAux +
    3745.25 * lonAux ** 2 +
    76.63 * latAux ** 2 -
    194.56 * lonAux ** 2 * latAux +
    119.79 * latAux ** 3;
  return [x + 1000000, y + 2000000]; // [N, E]
}

/**
 * Calcule le dénivelé positif/négatif d'un tracé via l'API d'altitude de
 * swisstopo (même méthode que scripts/fetch-via-alpina.py) — utilisé quand
 * on divise une étape officielle en deux, pour donner à chaque moitié un
 * dénivelé réel plutôt qu'une simple proportion de la distance.
 */
export const profil = action({
  args: { points: v.array(v.array(v.number())) },
  handler: async (_ctx, { points }) => {
    if (points.length < 2) return { gain: 0, loss: 0 };

    const lv95 = points.map(([lat, lon]) => wgs84ToLv95(lat, lon));
    const geom = {
      type: "LineString",
      coordinates: lv95.map(([n, e]) => [e, n]),
    };

    const res = await fetch("https://api3.geo.admin.ch/rest/services/profile.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ geom: JSON.stringify(geom), sr: "2056" }),
    });
    if (!res.ok) return { gain: 0, loss: 0 };

    const data = (await res.json()) as { alts: { COMB: number } }[];
    let gain = 0;
    let loss = 0;
    for (let i = 1; i < data.length; i++) {
      const d = data[i].alts.COMB - data[i - 1].alts.COMB;
      if (d > 0) gain += d;
      else loss += -d;
    }
    return { gain: Math.round(gain), loss: Math.round(loss) };
  },
});
