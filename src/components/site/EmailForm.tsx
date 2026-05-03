import { useState } from "react";
import { submitEarlyAccessSignup } from "@/functions/early-access.functions";

export function EmailForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setErrorMsg("Enter a valid email");
      return;
    }
    setStatus("submitting");
    setErrorMsg(null);
    try {
      await submitEarlyAccessSignup({
        data: {
          email: trimmed,
          source: typeof window !== "undefined" ? window.location.pathname : undefined,
          referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
      });
      setStatus("success");
      setEmail("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
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
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 relative" aria-label="Early access signup">
      <label htmlFor="email" className="sr-only">Email address</label>
      <input
        id="email"
        type="email"
        required
        disabled={status === "submitting"}
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
        placeholder="you@domain.com"
        className="flex-1 bg-transparent border border-rule px-4 py-3 font-body text-cream placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-accent focus:border-cyan-accent transition-colors disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="font-mono text-[12px] uppercase tracking-[0.14em] px-6 py-3 bg-cyan-accent text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting…" : "Get Early Access"}
      </button>
      {status === "error" && errorMsg && (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-destructive sm:absolute sm:-bottom-6 sm:left-0">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
