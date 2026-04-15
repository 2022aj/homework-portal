import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/admin-session";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function GET() {
  const isAdmin = await requireAdminSession();
  const supabaseAdmin = getSupabaseAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [
    { data: assignments, error: assignmentsError },
    { data: questionBank, error: questionBankError },
  ] = await Promise.all([
    supabaseAdmin.from("assignments").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("question_bank").select("*").order("created_at", { ascending: true }),
  ]);

  if (assignmentsError || questionBankError) {
    return NextResponse.json(
      {
        error:
          assignmentsError?.message ??
          questionBankError?.message ??
          "Could not load admin data.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    assignments: assignments ?? [],
    questionBank: questionBank ?? [],
  });
}

export async function POST(request: Request) {
  const isAdmin = await requireAdminSession();
  const supabaseAdmin = getSupabaseAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    dueDate?: string | null;
    allowedFileTypes?: string[];
  };

  const { title, description, dueDate, allowedFileTypes } = body;

  if (!title?.trim() || !allowedFileTypes?.length) {
    return NextResponse.json(
      { error: "Missing assignment details." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.from("assignments").insert({
    title: title.trim(),
    description: description?.trim() || null,
    due_date: dueDate || null,
    allowed_file_types: allowedFileTypes,
  });

  if (error) {
    return NextResponse.json(
      { error: `Could not save assignment: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
