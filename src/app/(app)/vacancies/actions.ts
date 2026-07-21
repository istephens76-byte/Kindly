"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error?: string;
  success?: boolean;
}

async function requireMembership() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." } as const;
  }

  const { data: member } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!member) {
    return { error: "No company found for this account." } as const;
  }

  return { supabase, companyId: member.company_id } as const;
}

const addSkillSchema = z.object({
  label: z.string().trim().min(1, "Required").max(60),
});

export async function addSkill(
  vacancyId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireMembership();
  if ("error" in auth) return { error: auth.error };

  const parsed = addSkillSchema.safeParse({
    label: formData.get("label") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await auth.supabase.from("vacancy_skills").insert({
    vacancy_id: vacancyId,
    label: parsed.data.label,
    source: "manual",
  });

  if (error) {
    return { error: "Couldn't add this skill — try again." };
  }

  revalidatePath("/vacancies");
  return { success: true };
}

export async function removeSkill(skillId: string): Promise<ActionState> {
  const auth = await requireMembership();
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.supabase
    .from("vacancy_skills")
    .delete()
    .eq("id", skillId);

  if (error) {
    return { error: "Couldn't remove this skill — try again." };
  }

  revalidatePath("/vacancies");
  return { success: true };
}

// Vacancies are never deleted (no delete policy — see the RLS migration),
// so closing one out just archives it: tucked into the collapsed group in
// the UI, still fully accessible and reversible, and still valid for any
// generations that reference it.
export async function setVacancyArchived(
  vacancyId: string,
  archived: boolean,
): Promise<ActionState> {
  const auth = await requireMembership();
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.supabase
    .from("vacancies")
    .update({ archived })
    .eq("id", vacancyId);

  if (error) {
    return {
      error: archived
        ? "Couldn't archive this vacancy — try again."
        : "Couldn't restore this vacancy — try again.",
    };
  }

  revalidatePath("/vacancies");
  return { success: true };
}
