import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Etape, Hebergement, MaterielItem } from "@/types/database";

type EtapeApercu = Etape & {
  hebergements: Hebergement[];
  etape_participants: { participant_id: string; participants: { nom: string } | null }[];
};

type MaterielApercu = MaterielItem & {
  materiel_apports: { quantite: number }[];
};

export default async function TrekOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: etapes }, { data: materielItems }] = await Promise.all([
    supabase
      .from("etapes")
      .select(
        "*, hebergements(*), etape_participants(participant_id, participants(nom))"
      )
      .eq("trek_id", id)
      .order("ordre", { ascending: true })
      .returns<EtapeApercu[]>(),
    supabase
      .from("materiel_items")
      .select("*, materiel_apports(quantite)")
      .eq("trek_id", id)
      .returns<MaterielApercu[]>(),
  ]);

  const manques = (materielItems ?? [])
    .map((item) => {
      const apporte = (item.materiel_apports ?? []).reduce(
        (sum: number, a: { quantite: number }) => sum + a.quantite,
        0
      );
      return { ...item, apporte, manque: item.quantite_requise - apporte };
    })
    .filter((item) => item.manque > 0);

  return (
    <div className="space-y-8">
      {manques.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            ⚠️ Matériel manquant ({manques.length})
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {manques.map((item) => (
              <li key={item.id}>
                {item.nom} — {item.apporte}/{item.quantite_requise}
              </li>
            ))}
          </ul>
          <Link
            href={`/treks/${id}/materiel`}
            className="mt-3 inline-block text-sm font-medium text-amber-900 underline"
          >
            Voir le détail du matériel →
          </Link>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Itinéraire</h2>
          <Link
            href={`/treks/${id}/etapes`}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Gérer les étapes →
          </Link>
        </div>

        {(!etapes || etapes.length === 0) && (
          <p className="mt-3 text-sm text-slate-500">
            Aucune étape définie. Commence par ajouter le jour 1.
          </p>
        )}

        <ol className="mt-4 space-y-3">
          {(etapes ?? []).map((etape) => {
            const hebergement = etape.hebergements?.[0];
            const participants = etape.etape_participants ?? [];
            return (
              <li
                key={etape.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">
                    Jour {etape.ordre} — {etape.nom}
                  </p>
                  {etape.date && (
                    <span className="text-xs text-slate-400">
                      {etape.date}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {etape.point_depart ?? "?"} → {etape.point_arrivee ?? "?"}
                  {etape.distance_km ? ` · ${etape.distance_km} km` : ""}
                  {etape.denivele_positif ? ` · +${etape.denivele_positif}m` : ""}
                </p>
                {hebergement && (
                  <p className="mt-1 text-sm text-slate-600">
                    🏠 {hebergement.nom}{" "}
                    <span className="text-xs text-slate-400">
                      ({hebergement.type} ·{" "}
                      {hebergement.statut_reservation === "confirme"
                        ? "réservé"
                        : hebergement.statut_reservation === "en_cours"
                          ? "réservation en cours"
                          : "à réserver"}
                      )
                    </span>
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {participants.length === 0
                    ? "Personne d'inscrit pour l'instant"
                    : `👥 ${participants
                        .map((p) => p.participants?.nom)
                        .join(", ")}`}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
