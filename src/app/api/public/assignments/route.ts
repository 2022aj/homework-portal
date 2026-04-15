import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("id, title, description, due_date, allowed_file_types")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Could not load assignments: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ assignments: data ?? [] });
}
