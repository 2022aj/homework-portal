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

function formatSubmittedAt(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ReviewPage() {
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignmentTitle, setSelectedAssignmentTitle] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");

  const assignmentOptions = useMemo(() => {
    const titles = submissions
      .map((submission) => submission.assignments?.title)
      .filter((title): title is string => Boolean(title));

    return Array.from(new Set(titles)).sort((first, second) =>
      first.localeCompare(second),
    );
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesAssignment =
        selectedAssignmentTitle === "all" ||
        submission.assignments?.title === selectedAssignmentTitle;

      const matchesStudent =
        normalizedSearch.length === 0 ||
        submission.student_name.toLowerCase().includes(normalizedSearch);

      return matchesAssignment && matchesStudent;
    });
  }, [selectedAssignmentTitle, studentSearch, submissions]);

  useEffect(() => {
    let isActive = true;

    async function loadSubmissions() {
      const response = await fetch("/api/admin/review", {
        method: "GET",
        cache: "no-store",
      });

      if (!isActive) {
        return;
      }

      const payload = (await response.json()) as {
        submissions?: ReviewSubmission[];
        error?: string;
      };

      if (!response.ok) {
        setStatusMessage(payload.error ?? "Could not load submissions.");
        setIsLoading(false);
        return;
      }

      setSubmissions(payload.submissions ?? []);
      setIsLoading(false);
    }

    void loadSubmissions();

    return () => {
      isActive = false;
    };
  }, []);

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
              onChange={(event) => setSelectedAssignmentTitle(event.target.value)}
              value={selectedAssignmentTitle}
            >
              <option value="all">All assignments</option>
              {assignmentOptions.map((title) => (
                <option key={title} value={title}>
                  {title}
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
                setSelectedAssignmentTitle("all");
                setStudentSearch("");
              }}
              type="button"
            >
              Clear filters
            </button>
          </div>
        </div>

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
                    <p className="section-label">Submission</p>
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

                  <div className="flex items-start">
                    <a
                      className="button-secondary"
                      href={submission.file_url ?? "#"}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open uploaded file
                    </a>
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
                      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-700">
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
