import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/admin-session";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function POST(request: Request) {
  const isAdmin = await requireAdminSession();
  const supabaseAdmin = getSupabaseAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    assignmentId?: string;
    questionText?: string;
  };

  const assignmentId = body.assignmentId?.trim();
  const questionText = body.questionText?.trim();

  if (!assignmentId || !questionText) {
    return NextResponse.json(
      { error: "Missing question details." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.from("question_bank").insert({
    assignment_id: assignmentId,
    question_text: questionText,
  });

  if (error) {
    return NextResponse.json(
      { error: `Could not save question: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const isAdmin = await requireAdminSession();
  const supabaseAdmin = getSupabaseAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    questionId?: string;
    questionText?: string;
  };

  const questionId = body.questionId?.trim();
  const questionText = body.questionText?.trim();

  if (!questionId || !questionText) {
    return NextResponse.json(
      { error: "Missing question update details." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("question_bank")
    .update({ question_text: questionText })
    .eq("id", questionId);

  if (error) {
    return NextResponse.json(
      { error: `Could not update question: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const isAdmin = await requireAdminSession();
  const supabaseAdmin = getSupabaseAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get("questionId")?.trim();

  if (!questionId) {
    return NextResponse.json(
      { error: "Missing question id." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.from("question_bank").delete().eq("id", questionId);

  if (error) {
    return NextResponse.json(
      { error: `Could not delete question: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
