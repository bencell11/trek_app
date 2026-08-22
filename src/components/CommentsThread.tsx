"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/current-user";

export default function CommentsThread({ etapeId }: { etapeId: Id<"etapes"> }) {
  const comments = useQuery(api.comments.listByEtape, { etapeId });
  const createComment = useMutation(api.comments.create);
  const removeComment = useMutation(api.comments.remove);
  const { nom } = useCurrentUser();
  const [texte, setTexte] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim() || !nom) return;
    await createComment({ etapeId, auteur: nom, texte: texte.trim() });
    setTexte("");
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        💬 Commentaires
      </h3>
      <ul className="mt-2 space-y-2">
        {(comments ?? []).map((c) => (
          <li
            key={c._id}
            className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
          >
            <div>
              <span className="font-medium text-slate-800">{c.auteur}</span>
              <span className="ml-2 text-slate-600">{c.texte}</span>
            </div>
            {c.auteur === nom && (
              <button
                type="button"
                onClick={() => removeComment({ commentaireId: c._id })}
                className="shrink-0 text-xs text-slate-400 hover:text-red-600"
              >
                suppr.
              </button>
            )}
          </li>
        ))}
        {comments && comments.length === 0 && (
          <p className="text-sm text-slate-400">Aucun commentaire pour l&apos;instant.</p>
        )}
      </ul>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Ajouter un commentaire…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
