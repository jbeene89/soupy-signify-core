import { useState } from "react";
import { submitEarlyAccessSignup } from "@/functions/early-access.functions";

export function EmailForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [alreadyOnList, setAlreadyOnList] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setStatus("error");
      setErrorMsg("Enter your name");
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus("error");
      setErrorMsg("Enter a valid email");
      return;
    }
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const result = await submitEarlyAccessSignup({
        data: {
          name: trimmedName,
          email: trimmedEmail,
          source: typeof window !== "undefined" ? window.location.pathname : undefined,
          referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
      });
      setAlreadyOnList(result.alreadyOnList);
      setStatus("success");
      setName("");
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
        <p className="font-serif text-xl text-cream">
          {alreadyOnList ? "You're already on the list." : "You're on the list."}
        </p>
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground mt-2">
          § ONE EMAIL WHEN THE BUILD-OFF DROPS · ONE WHEN ACCESS OPENS
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 relative" aria-label="Early access signup">
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="ea-name" className="sr-only">Name</label>
        <input
          id="ea-name"
          type="text"
          required
          autoComplete="name"
          maxLength={120}
          disabled={status === "submitting"}
          value={name}
          onChange={(e) => { setName(e.target.value); if (status === "error") setStatus("idle"); }}
          placeholder="Your name"
          className="sm:w-[40%] bg-transparent border border-rule px-4 py-3 font-body text-cream placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-accent focus:border-cyan-accent transition-colors disabled:opacity-60"
        />
        <label htmlFor="ea-email" className="sr-only">Email address</label>
        <input
          id="ea-email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
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
      </div>
      {status === "error" && errorMsg && (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-destructive">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
