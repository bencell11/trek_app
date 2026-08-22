import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByTrek = query({
  args: { trekId: v.id("treks") },
  handler: async (ctx, { trekId }) => {
    const etapes = await ctx.db
      .query("etapes")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();

    const rows = (
      await Promise.all(
        etapes.map((etape) =>
          ctx.db
            .query("etapeParticipants")
            .withIndex("by_etape", (q) => q.eq("etapeId", etape._id))
            .collect()
        )
      )
    ).flat();

    return rows.map((r) => ({
      etapeId: r.etapeId,
      participantId: r.participantId,
    }));
  },
});

export const setForTrek = mutation({
  args: {
    trekId: v.id("treks"),
    presences: v.array(
      v.object({
        etapeId: v.id("etapes"),
        participantId: v.id("participants"),
      })
    ),
  },
  handler: async (ctx, { trekId, presences }) => {
    const etapes = await ctx.db
      .query("etapes")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();

    for (const etape of etapes) {
      const existing = await ctx.db
        .query("etapeParticipants")
        .withIndex("by_etape", (q) => q.eq("etapeId", etape._id))
        .collect();
      for (const row of existing) await ctx.db.delete(row._id);
    }

    for (const p of presences) {
      await ctx.db.insert("etapeParticipants", p);
    }
  },
});

export const add = mutation({
  args: { etapeId: v.id("etapes"), participantId: v.id("participants") },
  handler: async (ctx, { etapeId, participantId }) => {
    const existing = await ctx.db
      .query("etapeParticipants")
      .withIndex("by_etape", (q) => q.eq("etapeId", etapeId))
      .collect();
    if (existing.some((r) => r.participantId === participantId)) return;
    await ctx.db.insert("etapeParticipants", { etapeId, participantId });
  },
});

export const remove = mutation({
  args: { etapeId: v.id("etapes"), participantId: v.id("participants") },
  handler: async (ctx, { etapeId, participantId }) => {
    const existing = await ctx.db
      .query("etapeParticipants")
      .withIndex("by_etape", (q) => q.eq("etapeId", etapeId))
      .collect();
    const row = existing.find((r) => r.participantId === participantId);
    if (row) await ctx.db.delete(row._id);
  },
});
