import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const upsert = mutation({
  args: {
    etapeId: v.id("etapes"),
    nom: v.string(),
    type: v.union(
      v.literal("refuge"),
      v.literal("bivouac"),
      v.literal("hotel"),
      v.literal("autre")
    ),
    contact: v.optional(v.string()),
    statutReservation: v.union(
      v.literal("a_faire"),
      v.literal("en_cours"),
      v.literal("confirme")
    ),
    prixChf: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("hebergements")
      .withIndex("by_etape", (q) => q.eq("etapeId", args.etapeId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("hebergements", args);
  },
});
