import { useEffect, useState } from "react";

const links = [
  { href: "/#architecture", label: "Architecture" },
  { href: "/demo", label: "Try Demo" },
  { href: "/build-off", label: "Build-Off" },
  { href: "/#papers", label: "Papers" },
  { href: "/#access", label: "Get Access" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? "backdrop-blur-md bg-background/70 border-b border-rule" : ""
      }`}
    >
      <nav
        aria-label="Primary"
        className="max-w-[1200px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between"
      >
        <a href="/" className="font-serif text-base md:text-lg tracking-tight text-cream">
          SOUPY <span className="text-muted-foreground">·</span> TOGETHER
        </a>
        <div className="hidden md:flex items-center gap-8">
          {links.slice(0, 4).map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-cream transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/#access"
            className="font-mono text-[11px] uppercase tracking-[0.14em] px-4 py-2 bg-cyan-accent text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Get Early Access
          </a>
        </div>
        <a
          href="/#access"
          className="md:hidden font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-2 bg-cyan-accent text-primary-foreground"
        >
          Access
        </a>
      </nav>
    </header>
  );
}
