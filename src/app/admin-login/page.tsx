"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setErrorMessage(payload.error ?? "Login failed.");
      setIsSubmitting(false);
      return;
    }

    window.location.href = "/instructor";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10">
      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="card-panel card-panel-dark gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Instructor access
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Protected workspace
            </h1>
            <p className="text-lg leading-8 text-slate-300">
              Use your private admin password to access assignments, question
              banks, and the review dashboard.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-200">
              Students only need the submission page. Instructor tools stay
              behind this login.
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-slate-300">
              After logging in, you can create assignments, manage random
              question banks, and review final submissions.
            </div>
          </div>
        </div>

        <section className="card-panel gap-6">
          <div className="space-y-3">
            <p className="section-label">Admin sign-in</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              Enter your password
            </h2>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Admin password</span>
              <input
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your instructor password"
                required
                type="password"
                value={password}
              />
            </label>

            <button className="button-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            {errorMessage ? (
              <p className="status-box status-box-error">{errorMessage}</p>
            ) : null}
          </form>
        </section>
      </section>
    </main>
  );
}
