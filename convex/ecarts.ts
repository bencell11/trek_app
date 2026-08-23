import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Calcule un écart au tracé officiel (bivouac hors sentier, aller-retour
 * vers un point de vue/lac...) en routant à pied via openrouteservice
 * (profil foot-hiking, basé sur OSM comme le reste du tracé Via Alpina),
 * plutôt qu'une ligne droite qui ignorerait le relief/les obstacles.
 */
export const calculer = action({
  args: {
    departLat: v.number(),
    departLng: v.number(),
    arriveeLat: v.number(),
    arriveeLng: v.number(),
  },
  handler: async (_ctx, { departLat, departLng, arriveeLat, arriveeLng }) => {
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) throw new Error("ORS_API_KEY non configurée sur ce déploiement Convex.");

    const res = await fetch(
      "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [departLng, departLat],
            [arriveeLng, arriveeLat],
          ],
          elevation: true,
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Aucun chemin trouvé par openrouteservice entre ces deux points (${res.status}). ${body}`
      );
    }

    const data = await res.json();
    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates as [number, number, number][] | undefined;
    if (!coords || coords.length < 2) {
      throw new Error("Réponse openrouteservice inattendue : aucun tracé renvoyé.");
    }

    let gain = 0;
    let loss = 0;
    for (let i = 1; i < coords.length; i++) {
      const d = coords[i][2] - coords[i - 1][2];
      if (d > 0) gain += d;
      else loss += -d;
    }

    const distanceM = feature.properties?.summary?.distance ?? 0;
    const trace = coords.map(([lng, lat]) => [lat, lng]);

    return {
      trace,
      distanceKm: Math.round((distanceM / 1000) * 10) / 10,
      denivelePositif: Math.round(gain),
      deniveleNegatif: Math.round(loss),
    };
  },
});
