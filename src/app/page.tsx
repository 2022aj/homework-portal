import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-10 lg:px-10">
      <section className="hero-shell w-full rounded-[2.2rem] p-8 md:p-12">
        <div className="flex flex-col items-center gap-8 text-center">
          <p className="hero-chip">Logistics Projects Submission Portal</p>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950 md:text-6xl md:leading-[1.05]">
            Logistics Projects Submission Portal
          </h1>

          <div className="flex w-full max-w-xl flex-col gap-4 sm:flex-row sm:justify-center">
            <Link className="button-primary flex-1" href="/submit">
              Student submission page
            </Link>
            <Link className="button-secondary flex-1" href="/admin-login">
              Admin login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
