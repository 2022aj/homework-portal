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
