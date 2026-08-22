import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByTrek = query({
  args: { trekId: v.id("treks") },
  handler: async (ctx, { trekId }) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();
    return participants.sort((a, b) => a.nom.localeCompare(b.nom));
  },
});

export const create = mutation({
  args: {
    trekId: v.id("treks"),
    nom: v.string(),
    email: v.optional(v.string()),
    telephone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("participants", args);
  },
});

export const remove = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, { participantId }) => {
    const presences = await ctx.db
      .query("etapeParticipants")
      .withIndex("by_participant", (q) => q.eq("participantId", participantId))
      .collect();
    for (const p of presences) await ctx.db.delete(p._id);

    const apports = await ctx.db
      .query("materielApports")
      .withIndex("by_participant", (q) => q.eq("participantId", participantId))
      .collect();
    for (const a of apports) await ctx.db.delete(a._id);

    await ctx.db.delete(participantId);
  },
});
