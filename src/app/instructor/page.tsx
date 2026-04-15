"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { supabase } from "@/lib/supabase";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  allowed_file_types: string[];
  created_at: string;
};

type QuestionBankQuestion = {
  id: string;
  assignment_id: string;
  question_text: string;
  created_at: string;
};

const fileTypeOptions = {
  excel: ["xlsx", "xls"],
  powerpoint: ["ppt", "pptx"],
  both: ["xlsx", "xls", "ppt", "pptx"],
} as const;

function formatDate(dateValue: string | null) {
  if (!dateValue) {
    return "No due date";
  }

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAllowedTypes(types: string[]) {
  return types.map((type) => `.${type}`).join(", ");
}

export default function InstructorPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionBankQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fileTypeGroup, setFileTypeGroup] =
    useState<keyof typeof fileTypeOptions>("excel");
  const [description, setDescription] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [questionStatusMessage, setQuestionStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [editingQuestionText, setEditingQuestionText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [draftQuestions, setDraftQuestions] = useState<Record<string, string>>({});

  async function fetchAssignments() {
    return supabase
      .from("assignments")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async function fetchQuestionBank() {
    return supabase
      .from("question_bank")
      .select("*")
      .order("created_at", { ascending: true });
  }

  useEffect(() => {
    let isActive = true;

    async function loadAssignments() {
      const [
        { data: assignmentData, error: assignmentError },
        { data: questionData, error: questionError },
      ] = await Promise.all([fetchAssignments(), fetchQuestionBank()]);

      if (!isActive) {
        return;
      }

      if (assignmentError) {
        setStatusMessage(`Could not load assignments: ${assignmentError.message}`);
        setIsLoading(false);
        return;
      }

      if (questionError) {
        setQuestionStatusMessage(
          `Could not load question bank: ${questionError.message}`,
        );
        setIsLoading(false);
        return;
      }

      setAssignments((assignmentData as Assignment[]) ?? []);
      setQuestionBank((questionData as QuestionBankQuestion[]) ?? []);
      setIsLoading(false);
    }

    void loadAssignments();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage("");

    const { error } = await supabase.from("assignments").insert({
      title,
      description: description || null,
      due_date: dueDate || null,
      allowed_file_types: fileTypeOptions[fileTypeGroup],
    });

    if (error) {
      setStatusMessage(`Could not save assignment: ${error.message}`);
      setIsSaving(false);
      return;
    }

    setTitle("");
    setDueDate("");
    setFileTypeGroup("excel");
    setDescription("");
    setStatusMessage("Assignment saved successfully.");
    const { data, error: reloadError } = await fetchAssignments();

    if (reloadError) {
      setStatusMessage(
        `Assignment saved, but refreshing failed: ${reloadError.message}`,
      );
      setIsSaving(false);
      return;
    }

    setAssignments((data as Assignment[]) ?? []);
    setIsSaving(false);
  }

  async function handleQuestionSubmit(
    event: FormEvent<HTMLFormElement>,
    assignmentId: string,
  ) {
    event.preventDefault();

    const draftQuestion = draftQuestions[assignmentId]?.trim() ?? "";

    if (!draftQuestion) {
      setQuestionStatusMessage("Please type a question before saving it.");
      return;
    }

    setIsSavingQuestion(true);
    setQuestionStatusMessage("");

    const { error } = await supabase.from("question_bank").insert({
      assignment_id: assignmentId,
      question_text: draftQuestion,
    });

    if (error) {
      setQuestionStatusMessage(`Could not save question: ${error.message}`);
      setIsSavingQuestion(false);
      return;
    }

    const { data, error: reloadError } = await fetchQuestionBank();

    if (reloadError) {
      setQuestionStatusMessage(
        `Question saved, but refreshing failed: ${reloadError.message}`,
      );
      setIsSavingQuestion(false);
      return;
    }

    setQuestionBank((data as QuestionBankQuestion[]) ?? []);
    setDraftQuestions((currentDrafts) => ({
      ...currentDrafts,
      [assignmentId]: "",
    }));
    setQuestionStatusMessage("Question added to the assignment bank.");
    setIsSavingQuestion(false);
  }

  function updateDraftQuestion(assignmentId: string, value: string) {
    setDraftQuestions((currentDrafts) => ({
      ...currentDrafts,
      [assignmentId]: value,
    }));
  }

  function getQuestionsForAssignment(assignmentId: string) {
    return questionBank.filter((question) => question.assignment_id === assignmentId);
  }

  function startEditingQuestion(question: QuestionBankQuestion) {
    setEditingQuestionId(question.id);
    setEditingQuestionText(question.question_text);
    setQuestionStatusMessage("");
  }

  function cancelEditingQuestion() {
    setEditingQuestionId("");
    setEditingQuestionText("");
  }

  async function handleQuestionUpdate(questionId: string) {
    const trimmedQuestion = editingQuestionText.trim();

    if (!trimmedQuestion) {
      setQuestionStatusMessage("Question text cannot be empty.");
      return;
    }

    setIsSavingQuestion(true);
    setQuestionStatusMessage("");

    const { error } = await supabase
      .from("question_bank")
      .update({ question_text: trimmedQuestion })
      .eq("id", questionId);

    if (error) {
      setQuestionStatusMessage(`Could not update question: ${error.message}`);
      setIsSavingQuestion(false);
      return;
    }

    const { data, error: reloadError } = await fetchQuestionBank();

    if (reloadError) {
      setQuestionStatusMessage(
        `Question updated, but refreshing failed: ${reloadError.message}`,
      );
      setIsSavingQuestion(false);
      return;
    }

    setQuestionBank((data as QuestionBankQuestion[]) ?? []);
    setEditingQuestionId("");
    setEditingQuestionText("");
    setQuestionStatusMessage("Question updated successfully.");
    setIsSavingQuestion(false);
  }

  async function handleQuestionDelete(questionId: string) {
    setIsSavingQuestion(true);
    setQuestionStatusMessage("");

    const { error } = await supabase.from("question_bank").delete().eq("id", questionId);

    if (error) {
      setQuestionStatusMessage(`Could not delete question: ${error.message}`);
      setIsSavingQuestion(false);
      return;
    }

    const { data, error: reloadError } = await fetchQuestionBank();

    if (reloadError) {
      setQuestionStatusMessage(
        `Question deleted, but refreshing failed: ${reloadError.message}`,
      );
      setIsSavingQuestion(false);
      return;
    }

    setQuestionBank((data as QuestionBankQuestion[]) ?? []);
    if (editingQuestionId === questionId) {
      setEditingQuestionId("");
      setEditingQuestionText("");
    }
    setQuestionStatusMessage("Question deleted successfully.");
    setIsSavingQuestion(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="card-panel grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <p className="section-label">Instructor dashboard</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Create an assignment slot
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-700">
            This form now saves real assignments into Supabase. As soon as you
            create one here, it becomes available on the student upload page.
          </p>
          <div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="button-secondary" href="/review">
                Open review page
              </Link>
              <AdminLogoutButton />
            </div>
          </div>
        </div>

        <form
          className="grid gap-4 rounded-[1.5rem] bg-slate-50 p-6 ring-1 ring-slate-200"
          onSubmit={handleSubmit}
        >
          <label className="form-field">
            <span>Assignment title</span>
            <input
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Week 4 Excel Case Study"
              required
              type="text"
              value={title}
            />
          </label>

          <label className="form-field">
            <span>Due date</span>
            <input
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>

          <label className="form-field">
            <span>Accepted file type</span>
            <select
              onChange={(event) =>
                setFileTypeGroup(event.target.value as keyof typeof fileTypeOptions)
              }
              value={fileTypeGroup}
            >
              <option value="excel">Excel</option>
              <option value="powerpoint">PowerPoint</option>
              <option value="both">Excel and PowerPoint</option>
            </select>
          </label>

          <label className="form-field">
            <span>Instructions</span>
            <textarea
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add assignment instructions here..."
              rows={5}
              value={description}
            />
          </label>

          <button className="button-primary" disabled={isSaving} type="submit">
            {isSaving ? "Saving assignment..." : "Save assignment slot"}
          </button>

          {statusMessage ? (
            <p className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
              {statusMessage}
            </p>
          ) : null}

          {questionStatusMessage ? (
            <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-950">
              {questionStatusMessage}
            </p>
          ) : null}
        </form>
      </section>

      <section className="card-panel">
        <div className="mb-6 space-y-2">
          <p className="section-label">Upcoming assignments</p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Saved assignments and question banks
          </h2>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <p className="text-slate-600">Loading assignments...</p>
          ) : null}

          {!isLoading && assignments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-slate-700">
              No assignments yet. Create your first one above.
            </p>
          ) : null}

          {assignments.map((assignment) => (
            <article
              key={assignment.id}
              className="grid gap-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[0.9fr_1.1fr]"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Assignment</p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {assignment.title}
                  </h3>
                  {assignment.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {assignment.description}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Due date</p>
                    <p className="font-medium text-slate-800">
                      {formatDate(assignment.due_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Allowed files</p>
                    <p className="font-medium text-slate-800">
                      {formatAllowedTypes(assignment.allowed_file_types)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="section-label">Question bank</p>
                    <h4 className="text-lg font-semibold text-slate-900">
                      Random student questions
                    </h4>
                  </div>
                  <p className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    {getQuestionsForAssignment(assignment.id).length} saved
                  </p>
                </div>

                <form
                  className="grid gap-3"
                  onSubmit={(event) => void handleQuestionSubmit(event, assignment.id)}
                >
                  <label className="form-field">
                    <span>Add a reusable question</span>
                    <textarea
                      onChange={(event) =>
                        updateDraftQuestion(assignment.id, event.target.value)
                      }
                      placeholder="Example: Which slide best supports your conclusion, and why?"
                      rows={3}
                      value={draftQuestions[assignment.id] ?? ""}
                    />
                  </label>

                  <button
                    className="button-secondary"
                    disabled={isSavingQuestion}
                    type="submit"
                  >
                    {isSavingQuestion ? "Saving question..." : "Add to question bank"}
                  </button>
                </form>

                <div className="mt-4 grid gap-3">
                  {getQuestionsForAssignment(assignment.id).length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                      No questions yet. Add at least 3 so students can receive a
                      random set on submission.
                    </p>
                  ) : null}

                  {getQuestionsForAssignment(assignment.id).map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                            Bank question {index + 1}
                          </p>

                          {editingQuestionId === question.id ? (
                            <div className="mt-2 grid gap-3">
                              <textarea
                                onChange={(event) =>
                                  setEditingQuestionText(event.target.value)
                                }
                                rows={3}
                                value={editingQuestionText}
                              />
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                  className="button-secondary"
                                  disabled={isSavingQuestion}
                                  onClick={() => void handleQuestionUpdate(question.id)}
                                  type="button"
                                >
                                  {isSavingQuestion ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="button-secondary"
                                  disabled={isSavingQuestion}
                                  onClick={cancelEditingQuestion}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm leading-6 text-slate-800">
                              {question.question_text}
                            </p>
                          )}
                        </div>

                        {editingQuestionId !== question.id ? (
                          <div className="flex flex-col gap-2 sm:w-28">
                            <button
                              className="button-secondary"
                              onClick={() => startEditingQuestion(question)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="button-secondary"
                              disabled={isSavingQuestion}
                              onClick={() => void handleQuestionDelete(question.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
