import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  treks: defineTable({
    nom: v.string(),
    description: v.optional(v.string()),
    sectionViaAlpina: v.optional(v.string()),
    dateDebut: v.optional(v.string()),
    dateFin: v.optional(v.string()),
  }),

  etapes: defineTable({
    trekId: v.id("treks"),
    ordre: v.number(),
    nom: v.string(),
    pointDepart: v.optional(v.string()),
    pointArrivee: v.optional(v.string()),
    date: v.optional(v.string()),
    distanceKm: v.optional(v.number()),
    denivelePositif: v.optional(v.number()),
    deniveleNegatif: v.optional(v.number()),
    dureeEstimeeH: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_trek", ["trekId"]),

  hebergements: defineTable({
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
  }).index("by_etape", ["etapeId"]),

  participants: defineTable({
    trekId: v.id("treks"),
    nom: v.string(),
    email: v.optional(v.string()),
    telephone: v.optional(v.string()),
  }).index("by_trek", ["trekId"]),

  etapeParticipants: defineTable({
    etapeId: v.id("etapes"),
    participantId: v.id("participants"),
  })
    .index("by_etape", ["etapeId"])
    .index("by_participant", ["participantId"]),

  materielItems: defineTable({
    trekId: v.id("treks"),
    etapeId: v.optional(v.id("etapes")),
    nom: v.string(),
    categorie: v.optional(v.string()),
    quantiteRequise: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_trek", ["trekId"])
    .index("by_etape", ["etapeId"]),

  materielApports: defineTable({
    materielItemId: v.id("materielItems"),
    participantId: v.id("participants"),
    quantite: v.number(),
  })
    .index("by_item", ["materielItemId"])
    .index("by_participant", ["participantId"]),
});
