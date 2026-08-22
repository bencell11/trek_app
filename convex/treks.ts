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
