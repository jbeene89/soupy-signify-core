import { useState } from "react";

type Site = { name: string; url: string };

const ALL_SITES: Site[] = [
  { name: "Boat Lift Wizard", url: "https://boatliftwizard.com" },
  { name: "Soupy Cockpit", url: "https://soupycockpit.com" },
  { name: "Soupy MCP", url: "https://soupymcp.online" },
  { name: "Soupy Tag", url: "https://soupytag.company" },
  { name: "Soupy Together", url: "https://soupytogether.com" },
  { name: "Soupy Vet Claim", url: "https://soupyvetclaim.com" },
  { name: "Black Soups", url: "https://blacksoups.com" },
  { name: "SACE Concept", url: "https://saceconcept.com" },
  { name: "Invention Insight", url: "https://inventioninsight.com" },
  { name: "Quantize Flow", url: "https://quantizeflow.com" },
];

const THIS_SITE_HOST = "soupytogether.com";
const SITES = ALL_SITES.filter((s) => !s.url.includes(THIS_SITE_HOST));

function stripProtocol(url: string) {
  return url.replace(/^https?:\/\//, "");
}

export function SoupySites() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  }

  async function shareAll() {
    const text = `Check out our other Soupy sites:\n\n${SITES.map(
      (s) => `${s.name} — ${s.url}`,
    ).join("\n")}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: "Soupy sites",
          text,
        });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    copy(text, "share-all");
  }

  function copyAll() {
    const text = SITES.map((s) => `${s.name} — ${s.url}`).join("\n");
    copy(text, "copy-all");
  }

  return (
    <section
      aria-labelledby="soupy-sites-heading"
      className="border-t border-rule"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-20">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-4">
          § OUR OTHER SOUPY SITES
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2
            id="soupy-sites-heading"
            className="font-serif text-3xl md:text-4xl leading-tight text-cream max-w-2xl"
          >
            The rest of the Soupy Lab map.
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={shareAll}
              className="font-mono text-[11px] uppercase tracking-[0.14em] px-4 py-2 bg-cyan-accent text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {copied === "share-all" ? "Copied ✓" : "Check out our other Soupy sites"}
            </button>
            <button
              type="button"
              onClick={copyAll}
              className="font-mono text-[11px] uppercase tracking-[0.14em] px-4 py-2 border border-cream/40 text-cream hover:border-cyan-accent hover:text-cyan-accent transition-colors"
            >
              {copied === "copy-all" ? "Copied ✓" : "Copy all"}
            </button>
          </div>
        </div>

        <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SITES.map((site) => {
            const host = stripProtocol(site.url);
            const copyKey = `site-${host}`;
            return (
              <li
                key={site.url}
                className="border border-rule p-5 flex flex-col gap-3 hover:border-cyan-accent/60 transition-colors"
              >
                <a
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block group"
                >
                  <div className="font-serif text-xl text-cream group-hover:text-cyan-accent transition-colors">
                    {site.name}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
                    {host}
                  </div>
                </a>
                <div className="flex gap-2 mt-auto">
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-2 border border-rule text-cream/80 hover:text-cream hover:border-cream/40 transition-colors"
                  >
                    Visit ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => copy(site.url, copyKey)}
                    className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-2 border border-rule text-cream/80 hover:text-cream hover:border-cream/40 transition-colors"
                  >
                    {copied === copyKey ? "Copied ✓" : "Copy URL"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
