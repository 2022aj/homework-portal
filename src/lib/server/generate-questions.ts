import Anthropic from "@anthropic-ai/sdk";

// Cost-conscious model: at ~700 generations/year (140 students x 5
// submissions) this comfortably stays cheap. Bump to a Sonnet model if
// question quality ever needs to improve.
const QUESTION_GENERATION_MODEL = "claude-haiku-4-5";
const MAX_RESPONSE_TOKENS = 1024;

function buildPrompt(extractedText: string): string {
  return `You are reviewing a student's logistics class project submission.
Based only on the extracted file text below, generate exactly 3 follow-up questions for the student to answer.

Rules:
- Base the questions only on the provided file text.
- Do not use outside knowledge.
- Make the questions specific to this submission.
- At least one question should challenge an assumption, estimate, calculation, or cost figure.
- At least one question should ask the student to justify a recommendation or tradeoff.
- At least one question should ask the student to explain a risk, weakness, or implementation concern.
- Keep each question clear and concise.
- Return valid JSON only in this shape:
{
  "questions": [
    "Question 1",
    "Question 2",
    "Question 3"
  ]
}

Extracted file text:
${extractedText}`;
}

function parseQuestionsFromResponseText(responseText: string): string[] {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Claude's response did not contain JSON.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Claude's response was not valid JSON.");
  }

  const questions = (parsed as { questions?: unknown } | null)?.questions;

  if (
    !Array.isArray(questions) ||
    questions.length !== 3 ||
    !questions.every((question) => typeof question === "string" && question.trim().length > 0)
  ) {
    throw new Error("Claude did not return exactly 3 non-empty questions.");
  }

  return questions.map((question) => (question as string).trim());
}

/**
 * Sends extracted file text to Claude and returns exactly 3 follow-up
 * question strings. Throws on any failure (missing key, API error,
 * malformed response) so the caller can decide how to fall back.
 */
export async function generateFollowUpQuestions(
  extractedText: string,
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
  }

  if (!extractedText.trim()) {
    throw new Error("No extracted text was provided for question generation.");
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: QUESTION_GENERATION_MODEL,
    max_tokens: MAX_RESPONSE_TOKENS,
    messages: [
      {
        role: "user",
        content: buildPrompt(extractedText),
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return a text response.");
  }

  return parseQuestionsFromResponseText(textBlock.text);
}
