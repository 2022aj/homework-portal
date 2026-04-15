"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  allowed_file_types: string[];
};

type QuestionBankQuestion = {
  id: string;
  assignment_id: string;
  question_text: string;
};

type GeneratedQuestion = {
  id: string;
  question_text: string;
};

type AnswerDraft = Record<string, string>;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function formatAcceptedTypes(types: string[]) {
  return types.map((type) => `.${type}`).join(", ");
}

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

export default function SubmitPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentName, setStudentName] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState("");
  const [answerStatusMessage, setAnswerStatusMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingAnswers, setIsSavingAnswers] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [submissionId, setSubmissionId] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>(
    [],
  );
  const [answers, setAnswers] = useState<AnswerDraft>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === assignmentId) ?? null,
    [assignmentId, assignments],
  );

  useEffect(() => {
    let isActive = true;

    async function loadAssignments() {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, description, due_date, allowed_file_types")
        .order("created_at", { ascending: false });

      if (!isActive) {
        return;
      }

      if (error) {
        setUploadStatusMessage(`Could not load assignments: ${error.message}`);
        setIsLoadingAssignments(false);
        return;
      }

      const loadedAssignments = (data as Assignment[]) ?? [];
      setAssignments(loadedAssignments);
      setAssignmentId(loadedAssignments[0]?.id ?? "");
      setIsLoadingAssignments(false);
    }

    void loadAssignments();

    return () => {
      isActive = false;
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  function updateAnswer(questionId: string, value: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }));
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadStatusMessage("");
    setAnswerStatusMessage("");

    if (!selectedAssignment) {
      setUploadStatusMessage(
        "Please create an assignment first on the instructor page.",
      );
      return;
    }

    if (!selectedFile) {
      setUploadStatusMessage("Please choose a file before submitting.");
      return;
    }

    const extension = selectedFile.name.split(".").pop()?.toLowerCase() ?? "";

    if (!selectedAssignment.allowed_file_types.includes(extension)) {
      setUploadStatusMessage(
        `This assignment only accepts ${formatAcceptedTypes(
          selectedAssignment.allowed_file_types,
        )} files.`,
      );
      return;
    }

    const { data: questionBankRows, error: questionBankError } = await supabase
      .from("question_bank")
      .select("id, assignment_id, question_text")
      .eq("assignment_id", selectedAssignment.id);

    if (questionBankError) {
      setUploadStatusMessage(
        `Could not load the question bank: ${questionBankError.message}`,
      );
      return;
    }

    const availableQuestions = (questionBankRows as QuestionBankQuestion[]) ?? [];

    if (availableQuestions.length < 3) {
      setUploadStatusMessage(
        "This assignment needs at least 3 saved bank questions before a student can submit.",
      );
      return;
    }

    setIsUploading(true);

    const safeFileName = sanitizeFileName(selectedFile.name);
    const filePath = `${selectedAssignment.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("assignment-files")
      .upload(filePath, selectedFile, {
        upsert: false,
      });

    if (uploadError) {
      setUploadStatusMessage(`Could not upload file: ${uploadError.message}`);
      setIsUploading(false);
      return;
    }

    const { data: submissionData, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        assignment_id: selectedAssignment.id,
        student_name: studentName,
        file_name: selectedFile.name,
        file_path: filePath,
      })
      .select("id")
      .single();

    if (submissionError) {
      setUploadStatusMessage(
        `File uploaded, but saving failed: ${submissionError.message}`,
      );
      setIsUploading(false);
      return;
    }

    const selectedQuestions = pickRandomQuestions(availableQuestions, 3);

    const { data: questionRows, error: questionError } = await supabase
      .from("generated_questions")
      .insert(
        selectedQuestions.map((question) => ({
          submission_id: submissionData.id,
          question_text: question.question_text,
        })),
      )
      .select("id, question_text");

    if (questionError) {
      setUploadStatusMessage(
        `File uploaded, but question generation failed: ${questionError.message}`,
      );
      setIsUploading(false);
      return;
    }

    const savedQuestions = (questionRows as GeneratedQuestion[]) ?? [];
    setSubmissionId(submissionData.id);
    setGeneratedQuestions(savedQuestions);
    setAnswers(
      Object.fromEntries(savedQuestions.map((question) => [question.id, ""])),
    );
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadStatusMessage(
      "Assignment uploaded successfully. Answer the generated questions below.",
    );
    setIsUploading(false);
  }

  async function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnswerStatusMessage("");

    if (!submissionId || generatedQuestions.length === 0) {
      setAnswerStatusMessage("Upload a file first so questions can be generated.");
      return;
    }

    const missingAnswer = generatedQuestions.some(
      (question) => !answers[question.id]?.trim(),
    );

    if (missingAnswer) {
      setAnswerStatusMessage("Please answer every question before submitting.");
      return;
    }

    setIsSavingAnswers(true);

    const { error } = await supabase.from("student_answers").insert(
      generatedQuestions.map((question) => ({
        question_id: question.id,
        submission_id: submissionId,
        answer_text: answers[question.id].trim(),
      })),
    );

    if (error) {
      setAnswerStatusMessage(`Could not save answers: ${error.message}`);
      setIsSavingAnswers(false);
      return;
    }

    setStudentName("");
    setSubmissionId("");
    setGeneratedQuestions([]);
    setAnswers({});
    setAnswerStatusMessage("Answers saved successfully.");
    setIsSavingAnswers(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="card-panel space-y-4">
        <p className="section-label">Student submission</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Upload your assignment and answer follow-up questions
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-700">
          The upload form below now sends files to your Supabase bucket and
          saves the submission details in your database.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <form className="card-panel gap-5" onSubmit={handleUpload}>
          <label className="form-field">
            <span>Your name</span>
            <input
              onChange={(event) => setStudentName(event.target.value)}
              placeholder="Jordan Lee"
              required
              type="text"
              value={studentName}
            />
          </label>

          <label className="form-field">
            <span>Assignment</span>
            <select
              disabled={isLoadingAssignments || assignments.length === 0}
              onChange={(event) => setAssignmentId(event.target.value)}
              required
              value={assignmentId}
            >
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Upload file</span>
            <input
              accept=".xlsx,.xls,.ppt,.pptx"
              onChange={handleFileChange}
              ref={fileInputRef}
              required
              type="file"
            />
          </label>

          <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
            {selectedAssignment
              ? `Accepted for this assignment: ${formatAcceptedTypes(
                  selectedAssignment.allowed_file_types,
                )}`
              : "Create an assignment first on the instructor page."}
          </div>

          <button className="button-primary" disabled={isUploading} type="submit">
            {isUploading ? "Uploading assignment..." : "Upload assignment"}
          </button>

          {uploadStatusMessage ? (
            <p className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
              {uploadStatusMessage}
            </p>
          ) : null}
        </form>

        <form className="card-panel" onSubmit={handleAnswerSubmit}>
          <div className="space-y-2">
            <p className="section-label">Generated questions</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Answer the follow-up questions
            </h2>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
            These questions are now pulled randomly from the question bank for
            the assignment you selected.
          </div>

          <div className="mt-6 space-y-4">
            {generatedQuestions.length === 0 ? (
              <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                Upload a file first. Your questions will appear here right after
                the upload succeeds.
              </p>
            ) : null}

            {generatedQuestions.map((question, index) => (
              <label
                key={question.id}
                className="form-field rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
              >
                <span>
                  Question {index + 1}: {question.question_text}
                </span>
                <textarea
                  onChange={(event) =>
                    updateAnswer(question.id, event.target.value)
                  }
                  rows={4}
                  value={answers[question.id] ?? ""}
                />
              </label>
            ))}
          </div>

          <button
            className="button-primary mt-6"
            disabled={isSavingAnswers || generatedQuestions.length === 0}
            type="submit"
          >
            {isSavingAnswers ? "Saving answers..." : "Submit answers"}
          </button>

          {answerStatusMessage ? (
            <p className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
              {answerStatusMessage}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
