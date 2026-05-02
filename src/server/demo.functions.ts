import { createServerFn } from "@tanstack/react-start";
import { createHash } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { classifyPrompt, type ClassifierResult } from "@/lib/sace/classifier";

const ClassifyInput = z.object({
  prompt: z.string().trim().min(3, "Prompt is too short").max(2000, "Prompt is too long"),
  user_agent: z.string().max(500).optional(),
  client_ip: z.string().max(64).optional(), // best-effort, not trusted for auth
});

function dailySalt(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `soupy-demo-${day}`;
}

function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${ip}|${dailySalt()}`).digest("hex").slice(0, 32);
}

export interface DemoResponse {
  ok: true;
  result: ClassifierResult;
}

export const classifyDemo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ClassifyInput.parse(input))
  .handler(async ({ data }): Promise<DemoResponse> => {
    const result = classifyPrompt(data.prompt);

    // Best-effort persist — never block UX on logging.
    try {
      await supabaseAdmin.from("demo_submissions").insert({
        tier: result.tier,
        prompt_length: data.prompt.length,
        baseline_cost_cents: result.baselineCostCents,
        soupy_cost_cents: result.soupyCostCents,
        partners: result.partners,
        ip_hash: hashIp(data.client_ip),
        user_agent: data.user_agent ?? null,
      });
    } catch (err) {
      console.error("demo_submissions insert failed:", err);
    }

    return { ok: true, result };
  });

export const getTier0SavingsThisWeek = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ savedCents: number }> => {
    const { data, error } = await supabaseAdmin.rpc("get_tier0_savings_this_week");
    if (error) {
      console.error("get_tier0_savings_this_week error:", error);
      return { savedCents: 0 };
    }
    const cents = typeof data === "number" ? data : Number(data ?? 0);
    return { savedCents: Number.isFinite(cents) ? cents : 0 };
  });
