"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createMaterielItem(trekId: string, formData: FormData) {
  const supabase = await createClient();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return;

  const etapeId = String(formData.get("etape_id") ?? "").trim();
  const quantite = Number(formData.get("quantite_requise") ?? 1) || 1;

  const { error } = await supabase.from("materiel_items").insert({
    trek_id: trekId,
    etape_id: etapeId || null,
    nom,
    categorie: String(formData.get("categorie") ?? "").trim() || null,
    quantite_requise: quantite,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/treks/${trekId}/materiel`);
  revalidatePath(`/treks/${trekId}`);
}

export async function deleteMaterielItem(trekId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materiel_items")
    .delete()
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/treks/${trekId}/materiel`);
  revalidatePath(`/treks/${trekId}`);
}

export async function addApport(
  trekId: string,
  itemId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const participantId = String(formData.get("participant_id") ?? "");
  const quantite = Number(formData.get("quantite") ?? 1) || 1;
  if (!participantId) return;

  const { error } = await supabase
    .from("materiel_apports")
    .upsert(
      { materiel_item_id: itemId, participant_id: participantId, quantite },
      { onConflict: "materiel_item_id,participant_id" }
    );

  if (error) throw new Error(error.message);
  revalidatePath(`/treks/${trekId}/materiel`);
  revalidatePath(`/treks/${trekId}`);
}

export async function removeApport(trekId: string, apportId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materiel_apports")
    .delete()
    .eq("id", apportId);
  if (error) throw new Error(error.message);
  revalidatePath(`/treks/${trekId}/materiel`);
  revalidatePath(`/treks/${trekId}`);
}
