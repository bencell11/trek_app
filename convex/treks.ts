import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const treks = await ctx.db.query("treks").collect();
    return treks.sort((a, b) =>
      (a.dateDebut ?? "9999").localeCompare(b.dateDebut ?? "9999")
    );
  },
});

export const get = query({
  args: { trekId: v.id("treks") },
  handler: async (ctx, { trekId }) => {
    return await ctx.db.get(trekId);
  },
});

export const create = mutation({
  args: {
    nom: v.string(),
    description: v.optional(v.string()),
    sectionViaAlpina: v.optional(v.string()),
    dateDebut: v.optional(v.string()),
    dateFin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("treks", args);
  },
});

export const remove = mutation({
  args: { trekId: v.id("treks") },
  handler: async (ctx, { trekId }) => {
    const points = await ctx.db
      .query("pointsInteret")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();
    for (const p of points) await ctx.db.delete(p._id);

    const etapes = await ctx.db
      .query("etapes")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();
    for (const etape of etapes) {
      const hebergements = await ctx.db
        .query("hebergements")
        .withIndex("by_etape", (q) => q.eq("etapeId", etape._id))
        .collect();
      for (const h of hebergements) await ctx.db.delete(h._id);

      const presences = await ctx.db
        .query("etapeParticipants")
        .withIndex("by_etape", (q) => q.eq("etapeId", etape._id))
        .collect();
      for (const p of presences) await ctx.db.delete(p._id);

      const comments = await ctx.db
        .query("commentaires")
        .withIndex("by_etape", (q) => q.eq("etapeId", etape._id))
        .collect();
      for (const c of comments) await ctx.db.delete(c._id);
    }

    const materielItems = await ctx.db
      .query("materielItems")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();
    for (const item of materielItems) {
      const apports = await ctx.db
        .query("materielApports")
        .withIndex("by_item", (q) => q.eq("materielItemId", item._id))
        .collect();
      for (const a of apports) await ctx.db.delete(a._id);
      await ctx.db.delete(item._id);
    }

    for (const etape of etapes) await ctx.db.delete(etape._id);

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();
    for (const p of participants) await ctx.db.delete(p._id);

    await ctx.db.delete(trekId);
  },
});
