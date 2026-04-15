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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-10">
      <section className="card-panel gap-6">
        <div className="space-y-3">
          <p className="section-label">Admin access</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Instructor login
          </h1>
          <p className="text-lg leading-8 text-slate-700">
            This login protects the instructor dashboard and review pages.
            Students should only use the submission page.
          </p>
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
            <p className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
              {errorMessage}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
