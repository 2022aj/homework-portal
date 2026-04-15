import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type AnswerPayload = {
  questionId: string;
  answerText: string;
};

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const {
    submissionId,
    answers,
  } = (await request.json()) as {
    submissionId?: string;
    answers?: AnswerPayload[];
  };

  if (!submissionId || !answers?.length) {
    return NextResponse.json(
      { error: "Missing submission or answers." },
      { status: 400 },
    );
  }

  const { data: savedQuestions, error: questionError } = await supabaseAdmin
    .from("generated_questions")
    .select("id")
    .eq("submission_id", submissionId);

  if (questionError) {
    return NextResponse.json(
      { error: `Could not validate submission questions: ${questionError.message}` },
      { status: 500 },
    );
  }

  const validQuestionIds = new Set((savedQuestions ?? []).map((question) => question.id));
  const hasInvalidAnswer = answers.some(
    (answer) =>
      !validQuestionIds.has(answer.questionId) || !answer.answerText.trim(),
  );

  if (hasInvalidAnswer) {
    return NextResponse.json(
      { error: "One or more answers are invalid." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.from("student_answers").insert(
    answers.map((answer) => ({
      question_id: answer.questionId,
      submission_id: submissionId,
      answer_text: answer.answerText.trim(),
    })),
  );

  if (error) {
    return NextResponse.json(
      { error: `Could not save answers: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
