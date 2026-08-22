"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createParticipant(trekId: string, formData: FormData) {
  const supabase = await createClient();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return;

  const { error } = await supabase.from("participants").insert({
    trek_id: trekId,
    nom,
    email: String(formData.get("email") ?? "").trim() || null,
    telephone: String(formData.get("telephone") ?? "").trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/treks/${trekId}/participants`);
  revalidatePath(`/treks/${trekId}`);
}

export async function deleteParticipant(
  trekId: string,
  participantId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("id", participantId);
  if (error) throw new Error(error.message);
  revalidatePath(`/treks/${trekId}/participants`);
  revalidatePath(`/treks/${trekId}`);
}

export async function updatePresence(trekId: string, formData: FormData) {
  const supabase = await createClient();

  const etapeIds = JSON.parse(String(formData.get("etape_ids") ?? "[]"));
  const participantIds = JSON.parse(
    String(formData.get("participant_ids") ?? "[]")
  );

  const rows: { etape_id: string; participant_id: string }[] = [];
  for (const etapeId of etapeIds) {
    for (const participantId of participantIds) {
      if (formData.get(`presence_${etapeId}_${participantId}`) === "on") {
        rows.push({ etape_id: etapeId, participant_id: participantId });
      }
    }
  }

  const { error: deleteError } = await supabase
    .from("etape_participants")
    .delete()
    .in("etape_id", etapeIds.length > 0 ? etapeIds : ["00000000-0000-0000-0000-000000000000"]);
  if (deleteError) throw new Error(deleteError.message);

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("etape_participants")
      .insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath(`/treks/${trekId}/participants`);
  revalidatePath(`/treks/${trekId}`);
}
