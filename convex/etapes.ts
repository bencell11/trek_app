import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listWithHebergement = query({
  args: { trekId: v.id("treks") },
  handler: async (ctx, { trekId }) => {
    const etapes = await ctx.db
      .query("etapes")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();
    etapes.sort((a, b) => a.ordre - b.ordre);

    return await Promise.all(
      etapes.map(async (etape) => {
        const hebergements = await ctx.db
          .query("hebergements")
          .withIndex("by_etape", (q) => q.eq("etapeId", etape._id))
          .collect();
        return { ...etape, hebergement: hebergements[0] ?? null };
      })
    );
  },
});

export const create = mutation({
  args: {
    trekId: v.id("treks"),
    nom: v.string(),
    pointDepart: v.optional(v.string()),
    pointArrivee: v.optional(v.string()),
    date: v.optional(v.string()),
    distanceKm: v.optional(v.number()),
    denivelePositif: v.optional(v.number()),
    deniveleNegatif: v.optional(v.number()),
    dureeEstimeeH: v.optional(v.number()),
    pointDepartLat: v.optional(v.number()),
    pointDepartLng: v.optional(v.number()),
    pointArriveeLat: v.optional(v.number()),
    pointArriveeLng: v.optional(v.number()),
    trace: v.optional(v.array(v.array(v.array(v.number())))),
    viaAlpinaRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("etapes")
      .withIndex("by_trek", (q) => q.eq("trekId", args.trekId))
      .collect();
    const ordre = existing.length + 1;
    return await ctx.db.insert("etapes", { ...args, ordre });
  },
});

export const remove = mutation({
  args: { etapeId: v.id("etapes") },
  handler: async (ctx, { etapeId }) => {
    const hebergements = await ctx.db
      .query("hebergements")
      .withIndex("by_etape", (q) => q.eq("etapeId", etapeId))
      .collect();
    for (const h of hebergements) await ctx.db.delete(h._id);

    const presences = await ctx.db
      .query("etapeParticipants")
      .withIndex("by_etape", (q) => q.eq("etapeId", etapeId))
      .collect();
    for (const p of presences) await ctx.db.delete(p._id);

    const items = await ctx.db
      .query("materielItems")
      .withIndex("by_etape", (q) => q.eq("etapeId", etapeId))
      .collect();
    for (const item of items) {
      const apports = await ctx.db
        .query("materielApports")
        .withIndex("by_item", (q) => q.eq("materielItemId", item._id))
        .collect();
      for (const a of apports) await ctx.db.delete(a._id);
      await ctx.db.delete(item._id);
    }

    const comments = await ctx.db
      .query("commentaires")
      .withIndex("by_etape", (q) => q.eq("etapeId", etapeId))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);

    await ctx.db.delete(etapeId);
  },
});
