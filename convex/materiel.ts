import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByTrek = query({
  args: { trekId: v.id("treks") },
  handler: async (ctx, { trekId }) => {
    const items = await ctx.db
      .query("materielItems")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();

    return await Promise.all(
      items.map(async (item) => {
        const apports = await ctx.db
          .query("materielApports")
          .withIndex("by_item", (q) => q.eq("materielItemId", item._id))
          .collect();

        const apportsAvecParticipant = await Promise.all(
          apports.map(async (a) => {
            const participant = await ctx.db.get(a.participantId);
            return {
              _id: a._id,
              quantite: a.quantite,
              participantId: a.participantId,
              participantNom: participant?.nom ?? "?",
            };
          })
        );

        const etape = item.etapeId ? await ctx.db.get(item.etapeId) : null;

        return {
          ...item,
          apports: apportsAvecParticipant,
          etape: etape ? { ordre: etape.ordre, nom: etape.nom } : null,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    trekId: v.id("treks"),
    etapeId: v.optional(v.id("etapes")),
    nom: v.string(),
    categorie: v.optional(v.string()),
    quantiteRequise: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("materielItems", args);
  },
});

export const remove = mutation({
  args: { itemId: v.id("materielItems") },
  handler: async (ctx, { itemId }) => {
    const apports = await ctx.db
      .query("materielApports")
      .withIndex("by_item", (q) => q.eq("materielItemId", itemId))
      .collect();
    for (const a of apports) await ctx.db.delete(a._id);
    await ctx.db.delete(itemId);
  },
});

export const addApport = mutation({
  args: {
    materielItemId: v.id("materielItems"),
    participantId: v.id("participants"),
    quantite: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("materielApports")
      .withIndex("by_item", (q) => q.eq("materielItemId", args.materielItemId))
      .collect();
    const match = existing.find((a) => a.participantId === args.participantId);

    if (match) {
      await ctx.db.patch(match._id, { quantite: args.quantite });
      return match._id;
    }
    return await ctx.db.insert("materielApports", args);
  },
});

export const removeApport = mutation({
  args: { apportId: v.id("materielApports") },
  handler: async (ctx, { apportId }) => {
    await ctx.db.delete(apportId);
  },
});
