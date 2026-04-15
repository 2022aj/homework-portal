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

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-10 lg:px-10">
      <section className="grid gap-10 rounded-[2rem] bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 backdrop-blur md:p-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold tracking-wide text-amber-900">
            Assignment Portal Starter
          </p>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              Collect homework files, ask follow-up questions, and review
              everything in one place.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700">
              This is the first version of your website for college homework
              submissions. Students can upload a file and answer questions.
              Instructors can create assignment slots and review responses.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link className="button-primary" href="/instructor">
              Open instructor dashboard
            </Link>
            <Link className="button-secondary" href="/submit">
              View student submission page
            </Link>
            <Link className="button-secondary" href="/review">
              Open review page
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-slate-950 p-6 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
            Build stages
          </p>
          <ol className="mt-6 space-y-4 text-sm leading-7 text-slate-200">
            <li>1. Set up the website structure</li>
            <li>2. Connect Supabase for data and file storage</li>
            <li>3. Add instructor assignment creation</li>
            <li>4. Add student uploads</li>
            <li>5. Save generated questions and student answers</li>
            <li>6. Review everything in one instructor page</li>
          </ol>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="card-panel">
          <div className="space-y-2">
            <p className="section-label">Student flow</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              What students will do
            </h2>
          </div>
          <ul className="space-y-3 text-slate-700">
            {studentSteps.map((step) => (
              <li
                key={step}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                {step}
              </li>
            ))}
          </ul>
        </div>

        <div className="card-panel">
          <div className="space-y-2">
            <p className="section-label">Instructor flow</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              What you will do
            </h2>
          </div>
          <ul className="space-y-3 text-slate-700">
            {instructorSteps.map((step) => (
              <li
                key={step}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                {step}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
