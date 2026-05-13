import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { SectionMarker } from "@/components/site/SectionMarker";
import { FadeIn } from "@/components/site/FadeIn";
import { EmailForm } from "@/components/site/EmailForm";
import { SaceEngineDemo } from "@/components/site/SaceEngineDemo";
import { HomeBuildOff } from "@/components/site/HomeBuildOff";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Soupy Together — Cost-disciplined AI orchestration" },
      { name: "description", content: "SACE classifies each AI coding task and routes it to the cheapest tool that can do it well. Four tiers, transparent pricing, public build-offs." },
      { property: "og:title", content: "Soupy Together — Cost-disciplined AI orchestration" },
      { property: "og:description", content: "Four-tier routing, transparent pricing, public build-offs. Stop paying frontier prices for trivial work." },
      { property: "og:url", content: "https://soupytogether.com/" },
    ],
    links: [{ rel: "canonical", href: "https://soupytogether.com/" }],
  }),
});

const tiers = [
  { tier: "TIER 0", title: "Local Absorption", pct: "60%", desc: "In-house model handles trivial work. No external API call." },
  { tier: "TIER 1", title: "Single Partner", pct: "30%", desc: "Routed to the partner tool best matched to the task." },
  { tier: "TIER 2", title: "Multi-Partner", pct: "9%", desc: "Composed across two or more specialized tools." },
  { tier: "TIER 3", title: "Cortex Escalation", pct: "1%", desc: "Frontier model invoked only on significance interrupt." },
];

const pricingRows = [
  { tool: "ChatGPT Plus", price: "$20", notes: "Conversational only — no orchestration" },
  { tool: "Cursor", price: "$20", notes: "IDE assistant — requires existing dev skill" },
  { tool: "v0 by Vercel", price: "$20", notes: "Frontend only" },
  { tool: "Lovable Pro", price: "$25", notes: "Frontend + Supabase, credit-capped" },
  { tool: "Replit Core", price: "$25", notes: "Plus separate agent credits" },
  { tool: "Bolt", price: "$20", notes: "Frontend, credit-capped" },
  { tool: "Claude Pro", price: "$20", notes: "Conversational, no orchestration" },
  { tool: "ChatGPT Pro", price: "$200", notes: "Frontier model access" },
  { tool: "Claude Max", price: "$200", notes: "Frontier model access" },
];


const papers = [
  {
    title: "SACE: A Significance-Aware Cognitive Architecture with Retroactive Memory Formation",
    desc: "The foundational architecture: anatomy over monolith, retroactive labeling, interrupt-driven cognition, polychromatic decay, and honest null states.",
  },
  {
    title: "Soupy Together: A Cost-Disciplined Multi-Agent Orchestration Platform",
    desc: "The product paper: four-tier execution, capability matrix methodology, transparent pricing, and additive partner economics.",
  },
  {
    title: "SACE Applied: A Significance-Aware Architecture for Multi-Agent Software Development",
    desc: "The bridge paper: how SACE's foundational primitives translate from conversational memory to development orchestration.",
  },
];

function Index() {
  return (
    <div id="top" className="min-h-screen text-cream">
      <Nav />

      <main className="max-w-[1200px] mx-auto px-6 md:px-10 pt-32 md:pt-40">
        {/* HERO */}
        <section aria-labelledby="hero-heading" className="pb-32 md:pb-40">
          <FadeIn>
            <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground mb-8">
              § 01 · INTRODUCTION
            </div>
            <h1
              id="hero-heading"
              className="font-serif text-[44px] sm:text-[64px] md:text-[88px] leading-[1.02] tracking-tight text-cream"
            >
              Stop paying frontier prices for trivial work.
            </h1>
            <p className="mt-8 font-serif italic text-xl md:text-2xl text-cream/90 max-w-3xl leading-snug">
              Soupy Together routes your AI coding tasks to the tool best suited for each one — and handles most of the work itself, before any external API call. You pay $29/month, plus only what you actually use.
            </p>
            <p className="mt-10 font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground max-w-3xl">
              § POWERED BY SACE — A PUBLISHED COGNITIVE ARCHITECTURE FOR SIGNIFICANCE-AWARE AI ORCHESTRATION
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a
                href="#access"
                className="font-mono text-[12px] uppercase tracking-[0.14em] px-6 py-3 bg-cyan-accent text-primary-foreground hover:opacity-90 transition-opacity text-center"
              >
                Get Early Access
              </a>
              <a
                href="#architecture"
                className="font-mono text-[12px] uppercase tracking-[0.14em] px-6 py-3 border border-cream/40 text-cream hover:border-cyan-accent hover:text-cyan-accent transition-colors text-center"
              >
                Read the Architecture →
              </a>
            </div>
            <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Soupy Lab LLC · Glen St. Mary, Florida · April 2026 · v1.0
            </p>
          </FadeIn>
        </section>

        <hr className="border-rule" />

        {/* BUILD-OFF (moved up — first concrete proof under the hero) */}
        <section id="build-off" aria-labelledby="buildoff-heading" className="py-32 md:py-40 scroll-mt-20">
          <FadeIn>
            <SectionMarker>§ 02 · BUILD-OFF</SectionMarker>
            <h2 id="buildoff-heading" className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
              The Build-Off, by category.
            </h2>
            <p className="font-serif italic text-xl md:text-2xl text-cream/80 mt-4 max-w-3xl">
              A rotating, public competition. Each category is one skill — frontend
              fidelity, backend correctness, refactor reliability, and so on. Every
              integrated AI coding tool runs the same task. We publish the podium.
              Brands earn a badge they can show. You pick which tool you want for
              each kind of work, and Soupy routes there when the job calls for it.
            </p>

            <HomeBuildOff />

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              <div className="border border-rule p-6">
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-3">
                  § HOW TO READ IT
                </div>
                <p className="font-body text-[15px] text-cream/85 leading-relaxed">
                  Soupy Together is the daily driver, not the top scorer. We don't
                  need to win — we need to know who does. When your job lands in a
                  category where another tool ranks first, that's where we route
                  it. You only pay for that call.
                </p>
              </div>
              <div className="border border-rule p-6">
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-3">
                  § FOR PARTNERS
                </div>
                <p className="font-body text-[15px] text-cream/85 leading-relaxed">
                  Rank 1st, 2nd, or 3rd in any category and you get an embeddable
                  SVG badge for your site. No tool can pay for placement. The
                  rubric is public; the receipts are public.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start">
              <a
                href="/build-off"
                className="font-mono text-[12px] uppercase tracking-[0.14em] px-6 py-3 bg-cyan-accent text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Full leaderboard & receipts →
              </a>
              <a
                href="/partners"
                className="font-mono text-[12px] uppercase tracking-[0.14em] px-6 py-3 border border-cream/40 text-cream hover:border-cyan-accent hover:text-cyan-accent transition-colors"
              >
                Partner with us →
              </a>
            </div>
          </FadeIn>
        </section>

        <hr className="border-rule" />

        {/* PROBLEM */}
        <section aria-labelledby="problem-heading" className="py-32 md:py-40">
          <FadeIn>
            <SectionMarker>§ 03 · THE PROBLEM</SectionMarker>
            <h2 id="problem-heading" className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
              Every AI coding tool hits a wall.
            </h2>
            <div className="grid md:grid-cols-3 gap-12 md:gap-10 mt-16">
              {[
                {
                  label: "CAPABILITY MISMATCH",
                  body: "Lovable is great for frontends. Cursor is great for refactors. Claude Code is great for backends. None of them know when to hand off. You hit a wall, give up, or pay credits to fake what they can't do.",
                },
                {
                  label: "FRONTIER OVERKILL",
                  body: "Renaming a button shouldn't cost the same as architecting a service. But every tool routes everything to its most expensive model. You burn $200/month in credits on $5 worth of actual reasoning.",
                },
                {
                  label: "OPAQUE PRICING",
                  body: "Credits don't map to dollars. You can't compare across vendors. You can't budget. You find out you're broke when the cap hits, not when the work was done.",
                },
              ].map((c) => (
                <div key={c.label}>
                  <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-cyan-accent mb-4">
                    {c.label}
                  </div>
                  <p className="font-body text-[17px] leading-[1.7] text-cream/90">{c.body}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        <hr className="border-rule" />

        {/* ARCHITECTURE */}
        <section id="architecture" aria-labelledby="arch-heading" className="py-32 md:py-40 scroll-mt-20">
          <FadeIn>
            <SectionMarker>§ 04 · ARCHITECTURE</SectionMarker>
            <h2 id="arch-heading" className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
              Anatomy over monolith.
            </h2>
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 mt-16">
              <div>
                <p className="font-body text-[18px] leading-[1.75] text-cream/90">
                  Soupy Together is built on SACE — the Significance-Aware Cognitive Engine, a published cognitive architecture that mirrors how biological nervous systems handle attention. Most processing happens in small specialized models near the sensor stream. The expensive frontier models are dormant by default and woken only on interrupt — when consensus across modalities indicates a significant event. The result is a system that handles 60% of requests for cents, escalates 30% to specialized partners, composes 9% across multiple tools, and only invokes a frontier model on the rare 1% that genuinely require it.
                </p>
                <div className="mt-8 border border-rule">
                  {tiers.map((t, i) => (
                    <div
                      key={t.tier}
                      className={`p-5 grid grid-cols-[1fr_auto] gap-4 items-baseline ${
                        i < tiers.length - 1 ? "border-b border-rule" : ""
                      }`}
                    >
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {t.tier}
                        </div>
                        <div className="font-serif text-xl mt-1 text-cream">{t.title}</div>
                      </div>
                      <div className="font-serif text-3xl text-cream tabular-nums">
                        {t.pct}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-4">
                  § LIVE ENGINE · DETERMINISTIC SIMULATION
                </div>
                <SaceEngineDemo />
                <p className="mt-4 font-serif italic text-[14px] text-muted-foreground">
                  Runs entirely in your browser. Same cortex synthesis logic published in the SACE paper. No LLM call, no telemetry — refresh to reset.
                </p>
              </div>
            </div>
          </FadeIn>
        </section>

        <hr className="border-rule" />

        {/* PRICING */}
        <section id="pricing" aria-labelledby="pricing-heading" className="py-32 md:py-40 scroll-mt-20">
          <FadeIn>
            <SectionMarker>§ 05 · PRICING</SectionMarker>
            <h2 id="pricing-heading" className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
              What it actually costs to build with AI.
            </h2>
            <p className="font-serif italic text-xl md:text-2xl text-cream/80 mt-4">
              Updated weekly. Source links below.
            </p>

            <div className="mt-12 border border-rule overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-rule">
                    <th className="text-left font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Tool</th>
                    <th className="text-left font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Monthly</th>
                    <th className="text-left font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingRows.map((r) => (
                    <tr key={r.tool} className="border-b border-rule last:border-b-0">
                      <td className="font-serif text-lg py-4 px-6 text-cream">{r.tool}</td>
                      <td className="font-serif text-lg py-4 px-6 text-cream tabular-nums">{r.price}</td>
                      <td className="font-body text-[15px] py-4 px-6 text-cream/80">{r.notes}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-cyan-accent bg-cyan-accent/[0.03]">
                    <td className="font-serif text-xl py-6 px-6 text-cream border-l-4 border-cyan-accent font-medium">
                      Soupy Together
                    </td>
                    <td className="font-serif text-2xl py-6 px-6 text-cream tabular-nums font-medium">$29</td>
                    <td className="font-body text-[16px] py-6 px-6 text-cream">
                      Routes across all of the above. Pay only for what gets called.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-6 font-serif italic text-[15px] text-muted-foreground">
              Prices reflect publicly listed subscription rates as of April 2026. We do not accept payment for placement or rankings. Methodology and receipts: <a href="/build-off" className="text-cyan-accent border-b border-cyan-accent/40 hover:border-cyan-accent">build-off ledger →</a>
            </p>

            <div className="mt-12 border border-cyan-accent p-8">
              <p className="font-serif italic text-xl leading-snug text-cream">
                Soupy Together is cheaper because most of what you ask AI to do — rename a variable, add a route, write a query, scaffold a component — doesn't need a $200/month frontier model. We handle the small stuff in-house and only call premium tools when you actually need premium output. You stop paying frontier prices for trivial work.
              </p>
            </div>
          </FadeIn>
        </section>

        <hr className="border-rule" />

        {/* INTEGRATIONS */}
        <section id="integrations" aria-labelledby="integrations-heading" className="py-32 md:py-40 scroll-mt-20">
          <FadeIn>
            <SectionMarker>§ 06 · INTEGRATIONS</SectionMarker>
            <h2 id="integrations-heading" className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
              Built to plug into the routing & observability stack.
            </h2>
            <p className="font-serif italic text-xl md:text-2xl text-cream/80 mt-4 max-w-3xl">
              Soupy is the significance layer above the wire. If you run an LLM gateway, router, or observability platform, Soupy's tier classification, capability matrix, and signed receipts are designed to feed into yours — not replace them.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mt-16">
              {[
                {
                  label: "FOR LLM GATEWAYS",
                  examples: "OpenRouter · Portkey · LiteLLM",
                  body: "Consume Soupy's tier-0/1/2/3 classification as a routing hint. We decide what's trivial vs. frontier-worthy; you handle the wire, fallbacks, and key vaulting. Cleaner separation than re-implementing classification per gateway.",
                },
                {
                  label: "FOR OBSERVABILITY",
                  examples: "Helicone · Langfuse · Arize",
                  body: "Every Soupy call emits a signed receipt with task, tier, partner, and cost. Ingest the receipt stream as a first-class span source — tier-tagged spend, partner attribution, and build-off provenance without instrumenting each tool.",
                },
                {
                  label: "FOR ROUTERS",
                  examples: "Martian · Not Diamond · RouteLLM",
                  body: "Model-level routing is solved. Task-level routing across tools (Cursor vs. Lovable vs. Claude Code) isn't. Soupy's capability matrix is the missing input — license it, or compose with it.",
                },
              ].map((c) => (
                <div key={c.label} className="border border-rule p-7 flex flex-col">
                  <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-3">
                    {c.label}
                  </div>
                  <div className="font-serif text-[15px] text-cream/70 mb-5 tabular-nums">
                    {c.examples}
                  </div>
                  <p className="font-body text-[15px] leading-[1.7] text-cream/90 flex-1">{c.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 border border-cyan-accent/60 p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-3">
                  § INTEGRATION PROGRAM · Q3 2026
                </div>
                <p className="font-serif italic text-xl leading-snug text-cream">
                  Receipt schema, capability matrix export, and webhook spec are in private review. If you're building a gateway, router, or observability layer and want Soupy's signal feeding yours, get on the integration list — separate from end-user early access.
                </p>
              </div>
              <a
                href="mailto:partners@soupytogether.com?subject=Integration%20Program"
                className="font-mono text-[12px] uppercase tracking-[0.14em] px-6 py-3 bg-cyan-accent text-primary-foreground hover:opacity-90 transition-opacity text-center whitespace-nowrap"
              >
                Request integration spec →
              </a>
            </div>
          </FadeIn>
        </section>

        <hr className="border-rule" />

        {/* PAPERS */}
        <section id="papers" aria-labelledby="papers-heading" className="py-32 md:py-40 scroll-mt-20">
          <FadeIn>
            <SectionMarker>§ 07 · TECHNICAL DISCLOSURE</SectionMarker>
            <h2 id="papers-heading" className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
              Read the architecture.
            </h2>
            <p className="font-serif italic text-xl md:text-2xl text-cream/80 mt-4 max-w-3xl">
              Soupy Together is the commercial implementation of work timestamped and published by Soupy Lab. The papers are open technical disclosures.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mt-16">
              {papers.map((p) => (
                <article key={p.title} className="border border-rule p-8 flex flex-col hover:border-cyan-accent/60 transition-colors">
                  <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-4">
                    WHITEPAPER · v1.0 · APRIL 2026
                  </div>
                  <h3 className="font-serif text-[22px] leading-snug text-cream">{p.title}</h3>
                  <p className="font-body text-[15px] text-cream/75 mt-4 flex-1">{p.desc}</p>
                  <a
                    href="/#access"
                    className="font-mono text-[12px] uppercase tracking-[0.14em] text-cyan-accent mt-6 self-start border-b border-cyan-accent/40 pb-1 hover:border-cyan-accent transition-colors"
                  >
                    Request preprint →
                  </a>
                </article>
              ))}
            </div>
          </FadeIn>
        </section>

        <hr className="border-rule" />

        {/* EARLY ACCESS */}
        <section id="access" aria-labelledby="access-heading" className="py-32 md:py-40 scroll-mt-20">
          <FadeIn>
            <SectionMarker>§ 08 · EARLY ACCESS</SectionMarker>
            <h2 id="access-heading" className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
              Built by a guy who pays for all of them.
            </h2>
            <p className="font-body text-[18px] leading-[1.75] text-cream/90 mt-8 max-w-3xl">
              Soupy Together is built by John "Soupy" Beene — marine construction superintendent, Army veteran, solo founder of Soupy Lab. I pay for Claude Pro, ChatGPT Plus, Lovable, Cursor, and Replit every month. I got tired of the credit math and built the tool I wanted to exist. If that sounds like a problem you've had, get on the early access list.
            </p>

            <div className="mt-12 max-w-2xl">
              <EmailForm />
            </div>

            <div className="mt-10 space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                § NO SPAM · NO INVESTOR-SPEAK · NO LAUNCH HYPE
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                § YOU GET ONE EMAIL WHEN THE BUILD-OFF DROPS · ONE EMAIL WHEN ACCESS OPENS
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                § THAT'S IT
              </p>
            </div>
          </FadeIn>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-rule">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-20 grid md:grid-cols-3 gap-12">
          {[
            {
              label: "SOUPY LAB",
              items: [
                { label: "Try Demo", href: "/demo" },
                { label: "Build-Off", href: "/build-off" },
                { label: "Partners", href: "/partners" },
              ],
            },
            {
              label: "TECHNICAL",
              items: [
                { label: "Architecture (SACE)", href: "/#architecture" },
                { label: "Whitepapers", href: "/#papers" },
                { label: "Pricing", href: "/#pricing" },
              ],
            },
            {
              label: "ACCESS",
              items: [
                { label: "Get Early Access", href: "/#access" },
                { label: "Contact", href: "mailto:hello@soupytogether.com" },
                { label: "Editorial Neutrality", href: "/#build-off" },
              ],
            },
          ].map((col) => (
            <div key={col.label}>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-5">
                {col.label}
              </div>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="font-serif text-[17px] text-cream hover:text-cyan-accent transition-colors">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-rule">
          <p className="max-w-[1200px] mx-auto px-6 md:px-10 py-6 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            SOUPY LAB LLC · GLEN ST. MARY, FLORIDA · APRIL 2026 · OPEN TECHNICAL DISCLOSURE · PRE-PATENT PUBLICATION
          </p>
        </div>
      </footer>
    </div>
  );
}
