import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByEtape = query({
  args: { etapeId: v.id("etapes") },
  handler: async (ctx, { etapeId }) => {
    const comments = await ctx.db
      .query("commentaires")
      .withIndex("by_etape", (q) => q.eq("etapeId", etapeId))
      .collect();
    return comments.sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const create = mutation({
  args: {
    etapeId: v.id("etapes"),
    auteur: v.string(),
    texte: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.texte.trim()) return;
    return await ctx.db.insert("commentaires", args);
  },
});

export const remove = mutation({
  args: { commentaireId: v.id("commentaires") },
  handler: async (ctx, { commentaireId }) => {
    await ctx.db.delete(commentaireId);
  },
});
