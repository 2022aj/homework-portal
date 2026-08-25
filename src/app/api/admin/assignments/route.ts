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

export async function PATCH(request: Request) {
  const isAdmin = await requireAdminSession();
  const supabaseAdmin = getSupabaseAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    assignmentId?: string;
    title?: string;
    description?: string | null;
    dueDate?: string | null;
    allowedFileTypes?: string[];
  };

  const { assignmentId, title, description, dueDate, allowedFileTypes } = body;

  if (!assignmentId?.trim() || !title?.trim() || !allowedFileTypes?.length) {
    return NextResponse.json(
      { error: "Missing assignment update details." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("assignments")
    .update({
      title: title.trim(),
      description: description?.trim() || null,
      due_date: dueDate || null,
      allowed_file_types: allowedFileTypes,
    })
    .eq("id", assignmentId);

  if (error) {
    return NextResponse.json(
      { error: `Could not update assignment: ${error.message}` },
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
  const assignmentId = searchParams.get("assignmentId")?.trim();
  const force = searchParams.get("force") === "true";

  if (!assignmentId) {
    return NextResponse.json({ error: "Missing assignment id." }, { status: 400 });
  }

  if (force) {
    const { data: submissionRows, error: submissionLookupError } =
      await supabaseAdmin
        .from("submissions")
        .select("id, file_path")
        .eq("assignment_id", assignmentId);

    if (submissionLookupError) {
      return NextResponse.json(
        {
          error: `Could not look up this assignment's submissions: ${submissionLookupError.message}`,
        },
        { status: 500 },
      );
    }

    const submissionIds = (submissionRows ?? []).map((row) => row.id);
    const filePaths = (submissionRows ?? [])
      .map((row) => row.file_path)
      .filter((path): path is string => Boolean(path));

    if (submissionIds.length > 0) {
      const { error: answersError } = await supabaseAdmin
        .from("student_answers")
        .delete()
        .in("submission_id", submissionIds);

      if (answersError) {
        return NextResponse.json(
          { error: `Could not delete student answers: ${answersError.message}` },
          { status: 500 },
        );
      }

      const { error: questionsError } = await supabaseAdmin
        .from("generated_questions")
        .delete()
        .in("submission_id", submissionIds);

      if (questionsError) {
        return NextResponse.json(
          {
            error: `Could not delete generated questions: ${questionsError.message}`,
          },
          { status: 500 },
        );
      }

      const { error: submissionsError } = await supabaseAdmin
        .from("submissions")
        .delete()
        .eq("assignment_id", assignmentId);

      if (submissionsError) {
        return NextResponse.json(
          { error: `Could not delete submissions: ${submissionsError.message}` },
          { status: 500 },
        );
      }

      if (filePaths.length > 0) {
        // Best-effort cleanup of the uploaded files in storage. Not fatal if
        // this fails — the database rows are already gone either way.
        await supabaseAdmin.storage.from("assignment-files").remove(filePaths);
      }
    }
  }

  const { error } = await supabaseAdmin
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    // Postgres foreign_key_violation: this assignment still has submissions
    // pointing at it, so it can't be removed without the force flag above.
    const isForeignKeyViolation = error.code === "23503";

    return NextResponse.json(
      {
        error: isForeignKeyViolation
          ? "This assignment already has student submissions attached to it."
          : `Could not delete assignment: ${error.message}`,
      },
      { status: isForeignKeyViolation ? 409 : 500 },
    );
  }

  return NextResponse.json({ success: true });
}
