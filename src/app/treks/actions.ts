"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTrek(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nom = String(formData.get("nom") ?? "").trim();
  const section_via_alpina = String(
    formData.get("section_via_alpina") ?? ""
  ).trim();
  const date_debut = String(formData.get("date_debut") ?? "") || null;
  const date_fin = String(formData.get("date_fin") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();

  if (!nom) return;

  const { data, error } = await supabase
    .from("treks")
    .insert({
      nom,
      section_via_alpina: section_via_alpina || null,
      date_debut,
      date_fin,
      description: description || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de créer le trek");
  }

  revalidatePath("/treks");
  redirect(`/treks/${data.id}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
