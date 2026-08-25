"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminLogoutButton } from "@/components/admin-logout-button";

type ReviewSubmission = {
  id: string;
  student_name: string;
  file_name: string;
  file_path: string;
  submitted_at: string;
  assignments: {
    id: string;
    title: string;
  } | null;
  generated_questions: Array<{
    id: string;
    question_text: string;
    student_answers: Array<{
      answer_text: string;
    }>;
  }>;
  file_url: string | null;
};

type AssignmentOption = {
  id: string;
  title: string;
};

function formatSubmittedAt(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function loadReviewData() {
  const [reviewResponse, assignmentsResponse] = await Promise.all([
    fetch("/api/admin/review", {
      method: "GET",
      cache: "no-store",
    }),
    fetch("/api/admin/assignments", {
      method: "GET",
      cache: "no-store",
    }),
  ]);

  const payload = (await reviewResponse.json()) as {
    submissions?: ReviewSubmission[];
    error?: string;
  };

  const assignmentsPayload = (await assignmentsResponse.json()) as {
    assignments?: AssignmentOption[];
    error?: string;
  };

  if (!reviewResponse.ok) {
    throw new Error(payload.error ?? "Could not load submissions.");
  }

  if (!assignmentsResponse.ok) {
    throw new Error(
      assignmentsPayload.error ?? "Could not load assignment filters.",
    );
  }

  return {
    submissions: payload.submissions ?? [],
    assignments: assignmentsPayload.assignments ?? [],
  };
}

export default function ReviewPage() {
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredSubmissions = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesAssignment =
        selectedAssignmentId === "all" ||
        submission.assignments?.id === selectedAssignmentId;

      const matchesStudent =
        normalizedSearch.length === 0 ||
        submission.student_name.toLowerCase().includes(normalizedSearch);

      return matchesAssignment && matchesStudent;
    });
  }, [selectedAssignmentId, studentSearch, submissions]);

  const allFilteredSelected =
    filteredSubmissions.length > 0 &&
    filteredSubmissions.every((submission) => selectedIds.has(submission.id));

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      try {
        const { submissions: submissionData, assignments: assignmentData } =
          await loadReviewData();

        if (!isActive) {
          return;
        }

        setSubmissions(submissionData);
        setAssignments(assignmentData);
        setIsLoading(false);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not load submissions.";
        setStatusMessage(message);
        setIsLoading(false);
      }
    }

    void initialize();

    return () => {
      isActive = false;
    };
  }, []);

  function toggleSelected(submissionId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(submissionId)) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filteredSubmissions.forEach((submission) => next.delete(submission.id));
      } else {
        filteredSubmissions.forEach((submission) => next.add(submission.id));
      }
      return next;
    });
  }

  async function refreshAfterDelete() {
    try {
      const { submissions: submissionData, assignments: assignmentData } =
        await loadReviewData();
      setSubmissions(submissionData);
      setAssignments(assignmentData);
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Deleted, but the list could not be refreshed. Reload the page to see current data.",
      );
    }
  }

  async function handleDeleteSubmission(submissionId: string) {
    const confirmed = window.confirm(
      "Delete this submission? This permanently removes the uploaded file, its generated questions, and the student's answers. This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setActionMessage("");

    const response = await fetch(
      `/api/admin/review?submissionId=${encodeURIComponent(submissionId)}`,
      { method: "DELETE" },
    );

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setActionMessage(payload.error ?? "Could not delete submission.");
      setIsDeleting(false);
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(submissionId);
      return next;
    });
    setActionMessage("Submission deleted.");
    await refreshAfterDelete();
    setIsDeleting(false);
  }

  async function handleBulkDelete() {
    const count = selectedIds.size;

    if (count === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${count} selected submission${count === 1 ? "" : "s"}? This permanently removes the uploaded files, their generated questions, and student answers. This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setActionMessage("");

    const response = await fetch("/api/admin/review", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissionIds: Array.from(selectedIds) }),
    });

    const payload = (await response.json()) as {
      error?: string;
      deletedCount?: number;
    };

    if (!response.ok) {
      setActionMessage(payload.error ?? "Could not delete the selected submissions.");
      setIsDeleting(false);
      return;
    }

    const deletedCount = payload.deletedCount ?? count;
    setSelectedIds(new Set());
    setActionMessage(
      `Deleted ${deletedCount} submission${deletedCount === 1 ? "" : "s"}.`,
    );
    await refreshAfterDelete();
    setIsDeleting(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="card-panel space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <p className="section-label">Instructor review</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Review student submissions
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-700">
              This page shows each uploaded file, the generated follow-up questions,
              and the student&apos;s saved answers in one place.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="button-secondary" href="/instructor">
              Back to instructor
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </section>

      <section className="card-panel">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Submission list</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Latest student work
            </h2>
          </div>
          <p className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            {filteredSubmissions.length} submission
            {filteredSubmissions.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mb-6 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="form-field">
            <span>Filter by assignment</span>
            <select
              onChange={(event) => setSelectedAssignmentId(event.target.value)}
              value={selectedAssignmentId}
            >
              <option value="all">All assignments</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Search student name</span>
            <input
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Type a student name..."
              type="text"
              value={studentSearch}
            />
          </label>

          <div className="flex items-end">
            <button
              className="button-secondary w-full"
              onClick={() => {
                setSelectedAssignmentId("all");
                setStudentSearch("");
              }}
              type="button"
            >
              Clear filters
            </button>
          </div>
        </div>

        {!isLoading && !statusMessage && filteredSubmissions.length > 0 ? (
          <div className="mb-6 flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                type="checkbox"
              />
              Select all shown ({filteredSubmissions.length})
            </label>

            <button
              className="button-secondary"
              disabled={selectedIds.size === 0 || isDeleting}
              onClick={() => void handleBulkDelete()}
              type="button"
            >
              {isDeleting
                ? "Deleting..."
                : `Delete selected (${selectedIds.size})`}
            </button>
          </div>
        ) : null}

        {actionMessage ? (
          <p className="mb-6 rounded-2xl bg-[#002e5d] px-4 py-3 text-sm text-white">
            {actionMessage}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-slate-600">Loading submissions...</p>
        ) : null}

        {statusMessage ? (
          <p className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
            {statusMessage}
          </p>
        ) : null}

        {!isLoading && !statusMessage && submissions.length === 0 ? (
          <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-700">
            No submissions yet. Once a student uploads a file and answers the
            questions, the submission will appear here.
          </p>
        ) : null}

        {!isLoading &&
        !statusMessage &&
        submissions.length > 0 &&
        filteredSubmissions.length === 0 ? (
          <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-700">
            No submissions match your current filters.
          </p>
        ) : null}

        <div className="grid gap-6">
          {filteredSubmissions.map((submission) => {
            return (
              <article
                key={submission.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        checked={selectedIds.has(submission.id)}
                        onChange={() => toggleSelected(submission.id)}
                        type="checkbox"
                      />
                      <span className="section-label">Submission</span>
                    </label>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-semibold text-slate-900">
                        {submission.assignments?.title ?? "Untitled assignment"}
                      </h3>
                      <p className="text-slate-700">
                        Submitted by{" "}
                        <span className="font-semibold">{submission.student_name}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                      <p>Uploaded file: {submission.file_name}</p>
                      <p>Submitted: {formatSubmittedAt(submission.submitted_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <a
                      className="button-secondary"
                      href={submission.file_url ?? "#"}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open uploaded file
                    </a>
                    <button
                      className="button-secondary"
                      disabled={isDeleting}
                      onClick={() => void handleDeleteSubmission(submission.id)}
                      type="button"
                    >
                      Delete submission
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {submission.generated_questions.length === 0 ? (
                    <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                      No questions were saved for this submission.
                    </p>
                  ) : null}

                  {submission.generated_questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#0062b8]">
                        Question {index + 1}
                      </p>
                      <p className="mt-2 text-lg font-medium text-slate-900">
                        {question.question_text}
                      </p>
                      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                        <p className="text-sm font-semibold text-slate-500">
                          Student answer
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-slate-800">
                          {question.student_answers[0]?.answer_text ??
                            "No answer was saved for this question."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
