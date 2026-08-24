import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#002e5d]">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-4 lg:px-10">
        <Link
          className="text-lg font-bold tracking-tight text-white sm:text-xl"
          href="/"
        >
          GSCM 404 Logistics
        </Link>
      </div>
    </header>
  );
}
