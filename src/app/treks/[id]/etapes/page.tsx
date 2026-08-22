import { createClient } from "@/lib/supabase/server";
import { createEtape, deleteEtape, upsertHebergement } from "./actions";
import type { Etape, Hebergement } from "@/types/database";

type EtapeAvecHebergement = Etape & { hebergements: Hebergement[] };

export default async function EtapesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trekId } = await params;
  const supabase = await createClient();

  const { data: etapes } = await supabase
    .from("etapes")
    .select("*, hebergements(*)")
    .eq("trek_id", trekId)
    .order("ordre", { ascending: true })
    .returns<EtapeAvecHebergement[]>();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {(etapes ?? []).map((etape) => {
          const heb = etape.hebergements?.[0];
          const boundUpsert = upsertHebergement.bind(null, trekId, etape.id);
          const boundDelete = deleteEtape.bind(null, trekId, etape.id);
          return (
            <div
              key={etape.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    Jour {etape.ordre} — {etape.nom}
                  </p>
                  <p className="text-sm text-slate-500">
                    {etape.point_depart ?? "?"} → {etape.point_arrivee ?? "?"}
                    {etape.distance_km ? ` · ${etape.distance_km} km` : ""}
                    {etape.denivele_positif
                      ? ` · +${etape.denivele_positif}m`
                      : ""}
                    {etape.denivele_negatif
                      ? ` / -${etape.denivele_negatif}m`
                      : ""}
                    {etape.date ? ` · ${etape.date}` : ""}
                  </p>
                </div>
                <form action={boundDelete}>
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Supprimer
                  </button>
                </form>
              </div>

              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-slate-600">
                  {heb ? `🏠 ${heb.nom} — modifier` : "Ajouter un hébergement"}
                </summary>
                <form
                  action={boundUpsert}
                  className="mt-3 grid grid-cols-2 gap-3"
                >
                  <input
                    name="nom"
                    defaultValue={heb?.nom}
                    required
                    placeholder="Nom du refuge / lieu de bivouac"
                    className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    name="type"
                    defaultValue={heb?.type ?? "refuge"}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="refuge">Refuge</option>
                    <option value="bivouac">Bivouac</option>
                    <option value="hotel">Hôtel</option>
                    <option value="autre">Autre</option>
                  </select>
                  <select
                    name="statut_reservation"
                    defaultValue={heb?.statut_reservation ?? "a_faire"}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="a_faire">À réserver</option>
                    <option value="en_cours">Réservation en cours</option>
                    <option value="confirme">Confirmé</option>
                  </select>
                  <input
                    name="contact"
                    defaultValue={heb?.contact ?? ""}
                    placeholder="Contact / téléphone"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    name="prix_chf"
                    type="number"
                    step="0.01"
                    defaultValue={heb?.prix_chf ?? ""}
                    placeholder="Prix (CHF)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    name="notes"
                    defaultValue={heb?.notes ?? ""}
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
        })}
        {(!etapes || etapes.length === 0) && (
          <p className="text-sm text-slate-500">Aucune étape pour l&apos;instant.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Ajouter une étape
        </h2>
        <form
          action={createEtape.bind(null, trekId)}
          className="mt-4 grid grid-cols-2 gap-3"
        >
          <input
            name="nom"
            required
            placeholder="Nom de l'étape"
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="point_depart"
            placeholder="Point de départ"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="point_arrivee"
            placeholder="Point d'arrivée"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="date"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="distance_km"
            type="number"
            step="0.1"
            placeholder="Distance (km)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="denivele_positif"
            type="number"
            placeholder="D+ (m)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="denivele_negatif"
            type="number"
            placeholder="D- (m)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="duree_estimee_h"
            type="number"
            step="0.5"
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
