import { createClient } from "@/lib/supabase/server";
import type { MaterielItem } from "@/types/database";
import {
  addApport,
  createMaterielItem,
  deleteMaterielItem,
  removeApport,
} from "./actions";

type ApportAvecParticipant = {
  id: string;
  quantite: number;
  participant_id: string;
  participants: { nom: string } | null;
};

type MaterielItemDetail = MaterielItem & {
  materiel_apports: ApportAvecParticipant[];
  etapes: { ordre: number; nom: string } | null;
};

export default async function MaterielPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trekId } = await params;
  const supabase = await createClient();

  const [{ data: items }, { data: participants }, { data: etapes }] =
    await Promise.all([
      supabase
        .from("materiel_items")
        .select("*, materiel_apports(id, quantite, participant_id, participants(nom)), etapes(ordre, nom)")
        .eq("trek_id", trekId)
        .order("created_at", { ascending: true })
        .returns<MaterielItemDetail[]>(),
      supabase
        .from("participants")
        .select("id, nom")
        .eq("trek_id", trekId)
        .order("nom", { ascending: true }),
      supabase
        .from("etapes")
        .select("id, ordre, nom")
        .eq("trek_id", trekId)
        .order("ordre", { ascending: true }),
    ]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {(items ?? []).map((item) => {
          const apports = item.materiel_apports ?? [];
          const totalApporte = apports.reduce(
            (s: number, a: { quantite: number }) => s + a.quantite,
            0
          );
          const diff = totalApporte - item.quantite_requise;
          const statut =
            diff < 0 ? "manquant" : diff > 0 ? "double" : "couvert";
          const etape = item.etapes;

          const badgeClass =
            statut === "manquant"
              ? "bg-red-50 text-red-700 border-red-200"
              : statut === "double"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200";

          return (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {item.nom}
                    {item.categorie && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {item.categorie}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {etape ? `Jour ${etape.ordre} — ${etape.nom}` : "Tout le trek"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                  >
                    {totalApporte}/{item.quantite_requise} ·{" "}
                    {statut === "manquant"
                      ? "manquant"
                      : statut === "double"
                        ? "en trop"
                        : "couvert"}
                  </span>
                  <form action={deleteMaterielItem.bind(null, trekId, item.id)}>
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Suppr.
                    </button>
                  </form>
                </div>
              </div>

              <ul className="mt-2 space-y-1">
                {apports.map((a) => {
                  const participant = a.participants;
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between text-sm text-slate-600"
                    >
                      <span>
                        {participant?.nom} apporte {a.quantite}
                      </span>
                      <form action={removeApport.bind(null, trekId, a.id)}>
                        <button
                          type="submit"
                          className="text-xs text-slate-400 hover:text-red-600"
                        >
                          retirer
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>

              {participants && participants.length > 0 && (
                <form
                  action={addApport.bind(null, trekId, item.id)}
                  className="mt-3 flex items-center gap-2"
                >
                  <select
                    name="participant_id"
                    required
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="">Qui apporte ?</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                  <input
                    name="quantite"
                    type="number"
                    min={1}
                    defaultValue={1}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    Ajouter
                  </button>
                </form>
              )}
            </div>
          );
        })}
        {(!items || items.length === 0) && (
          <p className="text-sm text-slate-500">
            Aucun item de matériel pour l&apos;instant.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Ajouter un item de matériel
        </h2>
        <form
          action={createMaterielItem.bind(null, trekId)}
          className="mt-4 grid grid-cols-2 gap-3"
        >
          <input
            name="nom"
            required
            placeholder="ex: Tente 2 places"
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="categorie"
            placeholder="Catégorie (abri, cuisine, sécurité...)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="quantite_requise"
            type="number"
            min={1}
            defaultValue={1}
            placeholder="Quantité requise"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="etape_id"
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tout le trek</option>
            {(etapes ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                Jour {e.ordre} — {e.nom}
              </option>
            ))}
          </select>
          <textarea
            name="notes"
            placeholder="Notes"
            rows={2}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="col-span-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Ajouter l&apos;item
          </button>
        </form>
      </div>
    </div>
  );
}
