import { useState } from "react";

export function EmailForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      return;
    }
    try {
      const existing = JSON.parse(localStorage.getItem("early_access_signups") || "[]");
      existing.push({ email: trimmed, created_at: new Date().toISOString() });
      localStorage.setItem("early_access_signups", JSON.stringify(existing));
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="border border-cyan-accent p-8">
        <p className="font-serif text-xl text-cream">You're on the list.</p>
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground mt-2">
          § ONE EMAIL WHEN THE BUILD-OFF DROPS · ONE WHEN ACCESS OPENS
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3" aria-label="Early access signup">
      <label htmlFor="email" className="sr-only">Email address</label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
        placeholder="you@domain.com"
        className="flex-1 bg-transparent border border-rule px-4 py-3 font-body text-cream placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-accent focus:border-cyan-accent transition-colors"
      />
      <button
        type="submit"
        className="font-mono text-[12px] uppercase tracking-[0.14em] px-6 py-3 bg-cyan-accent text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Get Early Access
      </button>
      {status === "error" && (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-destructive sm:absolute sm:-bottom-6">
          Enter a valid email
        </p>
      )}
    </form>
  );
}
