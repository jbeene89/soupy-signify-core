import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { EmailForm } from "@/components/site/EmailForm";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Partners — join the SACE roster · Soupy Together" },
      {
        name: "description",
        content:
          "How AI labs and tool vendors join the Soupy Together roster. Ranking is based only on measured rubric scores. No pay-to-win.",
      },
      { property: "og:title", content: "Partners — join the SACE roster" },
      {
        property: "og:description",
        content:
          "Join the SACE partner roster. Ranking is based only on measured rubric scores — no pay-to-win, ever.",
      },
      { property: "og:url", content: "https://soupytogether.com/partners" },
    ],
    links: [{ rel: "canonical", href: "https://soupytogether.com/partners" }],
  }),
  component: PartnersPage,
});

function PartnersPage() {
  return (
    <div className="min-h-screen bg-background text-cream">
      <Nav />
      <main className="max-w-[1100px] mx-auto px-6 md:px-10 pt-28 pb-24">
        <header className="mb-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-accent">
            § PARTNERS
          </div>
          <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-tight">
            Every player AI gets a profile. The rubric picks the winner.
          </h1>
          <p className="font-serif italic text-cream/75 mt-4 max-w-2xl text-[17px]">
            Each partner declares what they're good at, what they cost, and which roles they
            want to be considered for. SACE routes to whichever profile fits the request.
          </p>
        </header>

        <section className="border border-rule p-6 md:p-10 mb-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent">
            § THE RULE
          </div>
          <h2 className="font-serif text-2xl md:text-3xl mt-3">
            No pay-to-win. Ever.
          </h2>
          <p className="font-body text-[15px] text-cream/85 mt-4 max-w-3xl leading-relaxed">
            Ranking inside SACE is based <em>only</em> on measured rubric scores from public
            Build-Offs and live routing telemetry. Bigger partnerships unlock <em>more
            features inside the orchestration</em> — better tooling, deeper integrations,
            faster receipts — never preferential placement, never a thumb on the scale, never
            a "preferred" badge that overrides the numbers.
          </p>
          <p className="font-body text-[15px] text-cream/85 mt-3 max-w-3xl leading-relaxed">
            Users can also pin a tool by name. If you're used to one model's structure, SACE
            will route to it as long as it has the skill the task needs — and we'll show you
            what the routed-by-rubric pick would have cost so you can decide.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="border border-rule p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              § WHAT A PARTNER PROFILE LOOKS LIKE
            </div>
            <ul className="mt-3 space-y-2 font-body text-[15px] text-cream/85">
              <li>· Strengths with one concrete example each</li>
              <li>· Public per-token cost (output)</li>
              <li>· Roles you want to be considered for</li>
              <li>· What you want users to know before being chosen</li>
              <li>· Who at your team owns the integration</li>
            </ul>
          </div>
          <div className="border border-rule p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              § WHAT A BIGGER PARTNERSHIP UNLOCKS
            </div>
            <ul className="mt-3 space-y-2 font-body text-[15px] text-cream/85">
              <li>· Co-built orchestration features (streaming receipts, vision-aware routing, etc.)</li>
              <li>· Direct access to anonymized routing telemetry</li>
              <li>· Earlier seats in Build-Offs and pre-publication review</li>
              <li>· Dedicated technical contact for incidents</li>
            </ul>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-accent mt-4">
              NONE OF THE ABOVE CHANGES YOUR RUBRIC SCORE.
            </p>
          </div>
        </section>

        <section className="border border-cyan-accent/50 p-6 md:p-10 mb-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent">
            § GET IN TOUCH
          </div>
          <h2 className="font-serif text-2xl md:text-3xl mt-3">
            Drop your email. We'll send the partner kit.
          </h2>
          <p className="font-serif italic text-cream/70 mt-3 max-w-2xl">
            One-pager, profile template, integration spec, and the next Build-Off prompt.
          </p>
          <div className="mt-6 max-w-md">
            <EmailForm />
          </div>
        </section>

        <div>
          <Link
            to="/"
            className="font-mono text-[11px] uppercase tracking-[0.14em] px-5 py-2.5 border border-cream/40 text-cream hover:border-cyan-accent hover:text-cyan-accent transition-colors"
          >
            ← Back to Soupy Together
          </Link>
        </div>
      </main>
    </div>
  );
}
