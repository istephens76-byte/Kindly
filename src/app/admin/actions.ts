"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error?: string;
  success?: boolean;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." } as const;
  }

  const { data: member } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!member) {
    return { error: "No company found for this account." } as const;
  }

  if (member.role !== "admin") {
    return { error: "Only admins can do this." } as const;
  }

  return { supabase, companyId: member.company_id } as const;
}

const profileSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  about: z.string().trim().max(2000),
  values: z.string().trim().max(2000),
  voice: z.string().trim().max(2000),
  senderName: z.string().trim().max(200),
  talentLinkUrl: z.string().trim().url("Enter a valid URL"),
});

export async function saveProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const parsed = profileSchema.safeParse({
    companyName: formData.get("companyName") ?? "",
    about: formData.get("about") ?? "",
    values: formData.get("values") ?? "",
    voice: formData.get("voice") ?? "",
    senderName: formData.get("senderName") ?? "",
    talentLinkUrl: formData.get("talentLinkUrl") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error: companyError } = await auth.supabase
    .from("companies")
    .update({ name: parsed.data.companyName })
    .eq("id", auth.companyId);

  if (companyError) {
    return { error: "Couldn't save the company name — try again." };
  }

  const { error } = await auth.supabase.from("company_profiles").upsert(
    {
      company_id: auth.companyId,
      about: parsed.data.about,
      values: parsed.data.values,
      voice: parsed.data.voice,
      sender_name: parsed.data.senderName,
      talent_link_url: parsed.data.talentLinkUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );

  if (error) {
    return { error: "Couldn't save the profile — try again." };
  }

  revalidatePath("/admin");
  return { success: true };
}

const shellLinesSchema = z.object({
  warmLine: z.string().trim().min(1, "Required"),
  closingActive: z.string().trim().min(1, "Required"),
  closingOther: z.string().trim().min(1, "Required"),
  closingNo: z.string().trim().min(1, "Required"),
  talentLine: z.string().trim().min(1, "Required"),
});

export async function updateShellDraft(
  shellId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const parsed = shellLinesSchema.safeParse({
    warmLine: formData.get("warmLine") ?? "",
    closingActive: formData.get("closingActive") ?? "",
    closingOther: formData.get("closingOther") ?? "",
    closingNo: formData.get("closingNo") ?? "",
    talentLine: formData.get("talentLine") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // The .eq("status", "draft") guard means an already-active shell silently
  // can't be edited this way — the row count is just 0, not an error.
  const { error } = await auth.supabase
    .from("shells")
    .update({
      warm_line: parsed.data.warmLine,
      closing_active: parsed.data.closingActive,
      closing_other: parsed.data.closingOther,
      closing_no: parsed.data.closingNo,
      talent_line: parsed.data.talentLine,
    })
    .eq("id", shellId)
    .eq("company_id", auth.companyId)
    .eq("status", "draft");

  if (error) {
    return { error: "Couldn't save the draft — try again." };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function activateShell(shellId: string): Promise<ActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.supabase.rpc("activate_shell", {
    p_shell_id: shellId,
  });

  if (error) {
    return { error: "Couldn't activate this version — try again." };
  }

  revalidatePath("/admin");
  return { success: true };
}

const taxonomySchema = z.object({
  kind: z.enum(["reason", "strength"]),
  label: z.string().trim().min(1, "Required").max(200),
  needsSkill: z.boolean(),
});

export async function addTaxonomy(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const parsed = taxonomySchema.safeParse({
    kind: formData.get("kind"),
    label: formData.get("label") ?? "",
    needsSkill: formData.get("needsSkill") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { count } = await auth.supabase
    .from("taxonomies")
    .select("id", { count: "exact", head: true })
    .eq("company_id", auth.companyId)
    .eq("kind", parsed.data.kind);

  const { error } = await auth.supabase.from("taxonomies").insert({
    company_id: auth.companyId,
    kind: parsed.data.kind,
    label: parsed.data.label,
    needs_skill:
      parsed.data.kind === "reason" ? parsed.data.needsSkill : false,
    sort_order: count ?? 0,
  });

  if (error) {
    return { error: "Couldn't add this — try again." };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function setTaxonomyArchived(
  taxonomyId: string,
  archived: boolean,
): Promise<ActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.supabase
    .from("taxonomies")
    .update({ archived })
    .eq("id", taxonomyId)
    .eq("company_id", auth.companyId);

  if (error) {
    return { error: "Couldn't update this — try again." };
  }

  revalidatePath("/admin");
  return { success: true };
}
