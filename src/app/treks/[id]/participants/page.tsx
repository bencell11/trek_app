import { createClient } from "@/lib/supabase/server";
import {
  createParticipant,
  deleteParticipant,
  updatePresence,
} from "./actions";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trekId } = await params;
  const supabase = await createClient();

  const [{ data: participants }, { data: etapes }, { data: presences }] =
    await Promise.all([
      supabase
        .from("participants")
        .select("*")
        .eq("trek_id", trekId)
        .order("nom", { ascending: true }),
      supabase
        .from("etapes")
        .select("id, ordre, nom")
        .eq("trek_id", trekId)
        .order("ordre", { ascending: true }),
      supabase
        .from("etape_participants")
        .select("etape_id, participant_id"),
    ]);

  const presenceSet = new Set(
    (presences ?? []).map((p) => `${p.etape_id}_${p.participant_id}`)
  );
  const etapeIds = (etapes ?? []).map((e) => e.id);
  const participantIds = (participants ?? []).map((p) => p.id);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Participants</h2>
        <ul className="mt-3 space-y-2">
          {(participants ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium text-slate-900">{p.nom}</span>
                {p.email && (
                  <span className="ml-2 text-xs text-slate-400">
                    {p.email}
                  </span>
                )}
              </div>
              <form action={deleteParticipant.bind(null, trekId, p.id)}>
                <button
                  type="submit"
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Retirer
                </button>
              </form>
            </li>
          ))}
          {(!participants || participants.length === 0) && (
            <p className="text-sm text-slate-500">Aucun participant.</p>
          )}
        </ul>

        <form
          action={createParticipant.bind(null, trekId)}
          className="mt-4 grid grid-cols-3 gap-3"
        >
          <input
            name="nom"
            required
            placeholder="Nom"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="telephone"
            placeholder="Téléphone"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="col-span-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Ajouter le participant
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Qui est là, quand ?
        </h2>
        {(!etapes || etapes.length === 0 || !participants || participants.length === 0) ? (
          <p className="mt-3 text-sm text-slate-500">
            Ajoute d&apos;abord des étapes et des participants.
          </p>
        ) : (
          <form action={updatePresence.bind(null, trekId)} className="mt-4">
            <input type="hidden" name="etape_ids" value={JSON.stringify(etapeIds)} />
            <input
              type="hidden"
              name="participant_ids"
              value={JSON.stringify(participantIds)}
            />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-xs font-medium text-slate-500">
                      Participant
                    </th>
                    {(etapes ?? []).map((e) => (
                      <th
                        key={e.id}
                        className="p-2 text-center text-xs font-medium text-slate-500"
                      >
                        J{e.ordre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(participants ?? []).map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="p-2 font-medium text-slate-800">
                        {p.nom}
                      </td>
                      {(etapes ?? []).map((e) => (
                        <td key={e.id} className="p-2 text-center">
                          <input
                            type="checkbox"
                            name={`presence_${e.id}_${p.id}`}
                            defaultChecked={presenceSet.has(`${e.id}_${p.id}`)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Enregistrer la présence
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
