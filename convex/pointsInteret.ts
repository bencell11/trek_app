import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByTrek = query({
  args: { trekId: v.id("treks") },
  handler: async (ctx, { trekId }) => {
    return await ctx.db
      .query("pointsInteret")
      .withIndex("by_trek", (q) => q.eq("trekId", trekId))
      .collect();
  },
});

export const create = mutation({
  args: {
    trekId: v.id("treks"),
    nom: v.string(),
    type: v.union(
      v.literal("point_de_vue"),
      v.literal("lac"),
      v.literal("source"),
      v.literal("sommet"),
      v.literal("autre")
    ),
    lat: v.number(),
    lng: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pointsInteret", args);
  },
});

export const remove = mutation({
  args: { pointId: v.id("pointsInteret") },
  handler: async (ctx, { pointId }) => {
    await ctx.db.delete(pointId);
  },
});
