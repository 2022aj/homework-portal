import Link from "next/link";

const studentSteps = [
  "Open the assignment page",
  "Enter your name",
  "Upload an Excel or PowerPoint file",
  "Answer generated follow-up questions",
  "Submit everything for review",
];

const instructorSteps = [
  "Create an assignment slot",
  "Set a title, due date, and instructions",
  "Review uploaded files and student answers",
  "Leave feedback or download responses later",
];

const quickStats = [
  { label: "Accepted files", value: "Excel + PowerPoint" },
  { label: "Question style", value: "3 randomized prompts" },
  { label: "Instructor view", value: "Protected review dashboard" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-10 lg:px-10">
      <section className="hero-shell grid gap-10 overflow-hidden rounded-[2.2rem] p-8 md:p-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="hero-chip">Homework Portal</p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-6xl md:leading-[1.05]">
                A polished submission portal for homework, follow-up questions,
                and instructor review.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700 md:text-xl">
                Students get a focused submission experience. Instructors get a
                protected workspace for assignments, randomized question banks,
                and final review.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link className="button-primary" href="/submit">
              Submit an assignment
            </Link>
            <Link className="button-secondary" href="/admin-login">
              Instructor login
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {quickStats.map((stat) => (
              <div key={stat.label} className="hero-stat">
                <p className="hero-stat-label">{stat.label}</p>
                <p className="hero-stat-value">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-top">
            <span className="hero-dot bg-rose-400" />
            <span className="hero-dot bg-amber-400" />
            <span className="hero-dot bg-emerald-400" />
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.6rem] bg-slate-900 p-5 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                Student experience
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                {studentSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="hero-step-number">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[1.6rem] border border-slate-200 bg-white/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                Instructor experience
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                {instructorSteps.map((step) => (
                  <li key={step} className="rounded-2xl bg-slate-50 px-4 py-3">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card-panel card-panel-soft">
          <div className="space-y-2">
            <p className="section-label">Submission flow</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Designed to feel simple for students
            </h2>
          </div>
          <ul className="space-y-3 text-slate-700">
            {studentSteps.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4"
              >
                <span className="hero-step-number hero-step-light">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-panel card-panel-dark">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Protected tools
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Keep student access public while your admin tools stay private
            </h2>
            <p className="text-sm leading-7 text-slate-300">
              The live site now separates the student-facing experience from the
              instructor workspace, so you can share the submission link without
              exposing the dashboard.
            </p>
          </div>

          <ul className="space-y-3 text-slate-100">
            {instructorSteps.map((step) => (
              <li
                key={step}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                {step}
              </li>
            ))}
          </ul>

          <div className="rounded-[1.5rem] bg-white/8 p-4 text-sm leading-7 text-slate-200">
            Share with students:
            <div className="mt-2 rounded-2xl bg-black/20 px-4 py-3 font-mono text-xs text-sky-200">
              /submit
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
