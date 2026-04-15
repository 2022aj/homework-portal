"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  allowed_file_types: string[];
};

type GeneratedQuestion = {
  id: string;
  question_text: string;
};

type AnswerDraft = Record<string, string>;

function formatAcceptedTypes(types: string[]) {
  return types.map((type) => `.${type}`).join(", ");
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
      const response = await fetch("/api/public/assignments", {
        method: "GET",
        cache: "no-store",
      });

      if (!isActive) {
        return;
      }

      const payload = (await response.json()) as {
        assignments?: Assignment[];
        error?: string;
      };

      if (!response.ok) {
        setUploadStatusMessage(payload.error ?? "Could not load assignments.");
        setIsLoadingAssignments(false);
        return;
      }

      const loadedAssignments = payload.assignments ?? [];
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

    if (!selectedFile) {
      setUploadStatusMessage("Please choose a file before submitting.");
      return;
    }

    if (!selectedAssignment) {
      setUploadStatusMessage(
        "Please create an assignment first on the instructor page.",
      );
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

    setIsUploading(true);
    const formData = new FormData();
    formData.set("studentName", studentName);
    formData.set("assignmentId", selectedAssignment.id);
    formData.set("file", selectedFile);

    const response = await fetch("/api/public/submit", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      submissionId?: string;
      generatedQuestions?: GeneratedQuestion[];
      error?: string;
    };

    if (!response.ok) {
      setUploadStatusMessage(payload.error ?? "Could not submit assignment.");
      setIsUploading(false);
      return;
    }

    const savedQuestions = payload.generatedQuestions ?? [];
    setSubmissionId(payload.submissionId ?? "");
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

    const response = await fetch("/api/public/submit-answers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionId,
        answers: generatedQuestions.map((question) => ({
          questionId: question.id,
          answerText: answers[question.id].trim(),
        })),
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setAnswerStatusMessage(payload.error ?? "Could not save answers.");
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
      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <form className="card-panel card-panel-soft gap-5" onSubmit={handleUpload}>
          <div className="grid gap-4">
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
          </div>

          <div className="info-box info-box-sky">
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
            <p className="status-box">{uploadStatusMessage}</p>
          ) : null}
        </form>

        <form className="card-panel gap-5" onSubmit={handleAnswerSubmit}>
          <h2 className="text-2xl font-semibold text-slate-900">
            Questions
          </h2>

          <div className="space-y-4">
            {generatedQuestions.length === 0 ? (
              <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                Upload your file first. Your questions will be generated once the
                upload is successful.
              </p>
            ) : null}

            {generatedQuestions.map((question, index) => (
              <label
                key={question.id}
                className="form-field rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
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
            <p className="status-box">{answerStatusMessage}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
