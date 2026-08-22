"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function numOrNull(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s === "" ? null : Number(s);
}

export async function createEtape(trekId: string, formData: FormData) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("etapes")
    .select("*", { count: "exact", head: true })
    .eq("trek_id", trekId);

  const { error } = await supabase.from("etapes").insert({
    trek_id: trekId,
    ordre: (count ?? 0) + 1,
    nom: String(formData.get("nom") ?? "").trim(),
    point_depart: String(formData.get("point_depart") ?? "").trim() || null,
    point_arrivee: String(formData.get("point_arrivee") ?? "").trim() || null,
    date: String(formData.get("date") ?? "") || null,
    distance_km: numOrNull(formData.get("distance_km")),
    denivele_positif: numOrNull(formData.get("denivele_positif")),
    denivele_negatif: numOrNull(formData.get("denivele_negatif")),
    duree_estimee_h: numOrNull(formData.get("duree_estimee_h")),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/treks/${trekId}/etapes`);
  revalidatePath(`/treks/${trekId}`);
}

export async function deleteEtape(trekId: string, etapeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("etapes").delete().eq("id", etapeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/treks/${trekId}/etapes`);
  revalidatePath(`/treks/${trekId}`);
}

export async function upsertHebergement(
  trekId: string,
  etapeId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("hebergements")
    .select("id")
    .eq("etape_id", etapeId)
    .maybeSingle();

  const payload = {
    etape_id: etapeId,
    nom: String(formData.get("nom") ?? "").trim(),
    type: String(formData.get("type") ?? "refuge") as
      | "refuge"
      | "bivouac"
      | "hotel"
      | "autre",
    contact: String(formData.get("contact") ?? "").trim() || null,
    statut_reservation: String(
      formData.get("statut_reservation") ?? "a_faire"
    ) as "a_faire" | "en_cours" | "confirme",
    prix_chf: numOrNull(formData.get("prix_chf")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { error } = existing
    ? await supabase.from("hebergements").update(payload).eq("id", existing.id)
    : await supabase.from("hebergements").insert(payload);

  if (error) throw new Error(error.message);
  revalidatePath(`/treks/${trekId}/etapes`);
  revalidatePath(`/treks/${trekId}`);
}
