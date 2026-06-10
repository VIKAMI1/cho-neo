import Link from "next/link";

const spaces = [
  {
    title: "ChoNeo World",
    href: "/cho-neo/world",
    text: "Step into the dusk plaza before heading into the community.",
  },
  {
    title: "Show Off",
    href: "/show-off",
    text: "Post the set, the shelf, the station, the little win.",
  },
  {
    title: "Gossip",
    href: "/",
    text: "Light salon talk, venting, and community pulse checks.",
  },
  {
    title: "Market",
    href: "/",
    text: "A future corner for tools, services, deals, and local plugs.",
  },
  {
    title: "Ask / Help",
    href: "/",
    text: "Questions, advice, and practical help from people who get it.",
  },
];

export default function ChoNeoPage() {
  return (
    <main className="min-h-screen bg-[#fbf7ef] text-zinc-900">
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="relative mx-auto max-w-4xl px-4 py-8 md:py-12">
        <header className="rounded-2xl border border-zinc-200 bg-white/85 p-5 shadow-sm md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            ChoNeo
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
            A Vietnamese diaspora forum for people building lives across cities.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">
            ChoNeo is the spine: a familiar place to talk, show off, ask for help,
            and keep moving. The world page is just the front porch.
          </p>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-2">
          {spaces.map((space) => (
            <Link
              key={space.title}
              href={space.href}
              className="group rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{space.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {space.text}
                  </p>
                </div>
                <span className="mt-1 rounded-full border border-zinc-200 bg-[#fffdf8] px-3 py-1 text-xs font-semibold text-zinc-700 group-hover:border-amber-300">
                  Open
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
