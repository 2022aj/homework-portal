import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { extractTextFromUploadedFile } from "@/lib/server/extract-file-text";
import { generateFollowUpQuestions } from "@/lib/server/generate-questions";

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

/**
 * Tries to generate 3 submission-specific questions from the uploaded
 * file's extracted text via Claude. Returns null (instead of throwing) on
 * any failure so the caller can fall back to the question bank without
 * blocking the student's submission.
 */
async function tryGenerateQuestionsFromFile(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  filePath: string,
  fileName: string,
  submissionId: string,
): Promise<string[] | null> {
  try {
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from("assignment-files")
      .download(filePath);

    if (downloadError || !fileBlob) {
      throw new Error(
        downloadError?.message ?? "Could not download the uploaded file.",
      );
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const { text: extractedText } = await extractTextFromUploadedFile(
      buffer,
      fileName,
    );

    return await generateFollowUpQuestions(extractedText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(
      `AI question generation failed for submission ${submissionId}: ${message}`,
    );
    return null;
  }
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

  // Primary path: generate 3 questions from the uploaded file's own
  // content via Claude.
  const aiQuestionTexts = await tryGenerateQuestionsFromFile(
    supabaseAdmin,
    filePath.trim(),
    fileName.trim(),
    submissionData.id,
  );

  let questionsToInsert: { submission_id: string; question_text: string }[];

  if (aiQuestionTexts) {
    questionsToInsert = aiQuestionTexts.map((questionText) => ({
      submission_id: submissionData.id,
      question_text: questionText,
    }));
  } else {
    // Fallback path: Claude generation failed (missing key, API error,
    // unreadable file, etc). Fall back to the assignment's question bank
    // so the student isn't blocked.
    const { data: questionBankRows, error: questionBankError } =
      await supabaseAdmin
        .from("question_bank")
        .select("id, assignment_id, question_text")
        .eq("assignment_id", assignmentId);

    if (questionBankError) {
      await supabaseAdmin.from("submissions").delete().eq("id", submissionData.id);
      return NextResponse.json(
        {
          error: `Could not generate questions, and the question bank fallback failed: ${questionBankError.message}`,
        },
        { status: 500 },
      );
    }

    const availableQuestions = (questionBankRows as QuestionBankQuestion[]) ?? [];

    if (availableQuestions.length < 3) {
      await supabaseAdmin.from("submissions").delete().eq("id", submissionData.id);
      return NextResponse.json(
        {
          error:
            "We couldn't automatically generate questions from your file, and this assignment doesn't have a backup question bank set up yet. Please let your instructor know and try again shortly.",
        },
        { status: 500 },
      );
    }

    const selectedQuestions = pickRandomQuestions(availableQuestions, 3);
    questionsToInsert = selectedQuestions.map((question) => ({
      submission_id: submissionData.id,
      question_text: question.question_text,
    }));
  }

  const { data: questionRows, error: questionError } = await supabaseAdmin
    .from("generated_questions")
    .insert(questionsToInsert)
    .select("id, question_text");

  if (questionError) {
    await supabaseAdmin.from("submissions").delete().eq("id", submissionData.id);
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
