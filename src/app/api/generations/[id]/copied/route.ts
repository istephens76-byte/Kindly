import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { levenshteinDistance } from "@/lib/levenshtein";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  finalText: z.string().min(1),
});

// Brief §6a step 9: called when the recruiter copies the (possibly
// hand-edited) email. Computes edit_distance server-side against the
// originally generated text so it can't be spoofed from the client, and
// stores copied_at. RLS (generations_update_own) already restricts this to
// the generation's own creator.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { data: generation, error: fetchError } = await supabase
    .from("generations")
    .select("email_generated")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !generation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const editDistance = levenshteinDistance(
    generation.email_generated,
    parsedBody.data.finalText,
  );

  const { error: updateError } = await supabase
    .from("generations")
    .update({
      email_copied: parsedBody.data.finalText,
      edit_distance: editDistance,
      copied_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Couldn't record the copy — try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ editDistance });
}
