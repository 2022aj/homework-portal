import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type QuestionBankQuestion = {
  id: string;
  assignment_id: string;
  question_text: string;
};

function pickRandomQuestions(
  questions: QuestionBankQuestion[],
  count: number,
) {
  const shuffledQuestions = [...questions];

  for (let index = shuffledQuestions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledQuestions[index], shuffledQuestions[swapIndex]] = [
      shuffledQuestions[swapIndex],
      shuffledQuestions[index],
    ];
  }

  return shuffledQuestions.slice(0, count);
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const {
    studentName,
    assignmentId,
    fileName,
    filePath,
  } = (await request.json()) as {
    studentName?: string;
    assignmentId?: string;
    fileName?: string;
    filePath?: string;
  };

  if (
    !studentName?.trim() ||
    !assignmentId?.trim() ||
    !fileName?.trim() ||
    !filePath?.trim()
  ) {
    return NextResponse.json(
      { error: "Missing submission details." },
      { status: 400 },
    );
  }

  const { data: questionBankRows, error: questionBankError } = await supabaseAdmin
    .from("question_bank")
    .select("id, assignment_id, question_text")
    .eq("assignment_id", assignmentId);

  if (questionBankError) {
    return NextResponse.json(
      { error: `Could not load question bank: ${questionBankError.message}` },
      { status: 500 },
    );
  }

  const availableQuestions = (questionBankRows as QuestionBankQuestion[]) ?? [];

  if (availableQuestions.length < 3) {
    return NextResponse.json(
      {
        error:
          "This assignment needs at least 3 saved bank questions before a student can submit.",
      },
      { status: 400 },
    );
  }

  const { data: submissionData, error: submissionError } = await supabaseAdmin
    .from("submissions")
    .insert({
      assignment_id: assignmentId,
      student_name: studentName.trim(),
      file_name: fileName.trim(),
      file_path: filePath.trim(),
    })
    .select("id")
    .single();

  if (submissionError || !submissionData) {
    return NextResponse.json(
      { error: `Could not save submission: ${submissionError?.message}` },
      { status: 500 },
    );
  }

  const selectedQuestions = pickRandomQuestions(availableQuestions, 3);

  const { data: questionRows, error: questionError } = await supabaseAdmin
    .from("generated_questions")
    .insert(
      selectedQuestions.map((question) => ({
        submission_id: submissionData.id,
        question_text: question.question_text,
      })),
    )
    .select("id, question_text");

  if (questionError) {
    return NextResponse.json(
      { error: `Could not save generated questions: ${questionError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    submissionId: submissionData.id,
    generatedQuestions: questionRows ?? [],
  });
}
