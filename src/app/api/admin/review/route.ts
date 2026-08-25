import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/admin-session";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type SubmissionQueryRow = {
  id: string;
  student_name: string;
  file_name: string;
  file_path: string;
  submitted_at: string;
  assignment_id: string;
  assignments:
    | {
        id: string;
        title: string;
      }
    | Array<{
        id: string;
        title: string;
      }>
    | null;
  generated_questions: Array<{
    id: string;
    question_text: string;
    student_answers: Array<{
      answer_text: string;
    }>;
  }>;
};

export async function GET() {
  const isAdmin = await requireAdminSession();
  const supabaseAdmin = getSupabaseAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select(
      "id, assignment_id, student_name, file_name, file_path, submitted_at, assignments(id, title), generated_questions(id, question_text, student_answers(answer_text))",
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Could not load submissions: ${error.message}` },
      { status: 500 },
    );
  }

  const normalizedSubmissions = await Promise.all(
    ((data as SubmissionQueryRow[]) ?? []).map(async (submission) => {
      const assignment = Array.isArray(submission.assignments)
        ? submission.assignments[0] ?? null
        : submission.assignments;

      const signedUrlResponse = await supabaseAdmin.storage
        .from("assignment-files")
        .createSignedUrl(submission.file_path, 60 * 60);

      return {
        ...submission,
        assignments: assignment,
        file_url: signedUrlResponse.data?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ submissions: normalizedSubmissions });
}

export async function DELETE(request: Request) {
  const isAdmin = await requireAdminSession();
  const supabaseAdmin = getSupabaseAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const singleSubmissionId = searchParams.get("submissionId")?.trim();

  let submissionIds: string[] = [];

  if (singleSubmissionId) {
    submissionIds = [singleSubmissionId];
  } else {
    const body = (await request.json().catch(() => null)) as
      | { submissionIds?: string[] }
      | null;
    submissionIds = (body?.submissionIds ?? [])
      .map((id) => id?.trim())
      .filter((id): id is string => Boolean(id));
  }

  if (submissionIds.length === 0) {
    return NextResponse.json(
      { error: "No submission ids were provided." },
      { status: 400 },
    );
  }

  const { data: submissionRows, error: lookupError } = await supabaseAdmin
    .from("submissions")
    .select("id, file_path")
    .in("id", submissionIds);

  if (lookupError) {
    return NextResponse.json(
      { error: `Could not look up submissions: ${lookupError.message}` },
      { status: 500 },
    );
  }

  const foundIds = (submissionRows ?? []).map((row) => row.id);
  const filePaths = (submissionRows ?? [])
    .map((row) => row.file_path)
    .filter((path): path is string => Boolean(path));

  if (foundIds.length === 0) {
    return NextResponse.json(
      { error: "None of the requested submissions could be found." },
      { status: 404 },
    );
  }

  const { error: answersError } = await supabaseAdmin
    .from("student_answers")
    .delete()
    .in("submission_id", foundIds);

  if (answersError) {
    return NextResponse.json(
      { error: `Could not delete student answers: ${answersError.message}` },
      { status: 500 },
    );
  }

  const { error: questionsError } = await supabaseAdmin
    .from("generated_questions")
    .delete()
    .in("submission_id", foundIds);

  if (questionsError) {
    return NextResponse.json(
      { error: `Could not delete generated questions: ${questionsError.message}` },
      { status: 500 },
    );
  }

  const { error: submissionsError } = await supabaseAdmin
    .from("submissions")
    .delete()
    .in("id", foundIds);

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

  return NextResponse.json({ success: true, deletedCount: foundIds.length });
}
