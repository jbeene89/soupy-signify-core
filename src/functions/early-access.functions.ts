import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SignupInput = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(254),
  source: z.string().max(120).optional(),
  referrer: z.string().max(500).optional(),
  user_agent: z.string().max(500).optional(),
});

export const submitEarlyAccessSignup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignupInput.parse(input))
  .handler(async ({ data }) => {
    // Idempotent insert: if the email already exists, treat as success.
    const { error } = await supabaseAdmin
      .from("early_access_signups")
      .insert({
        email: data.email,
        source: data.source ?? null,
        referrer: data.referrer ?? null,
        user_agent: data.user_agent ?? null,
      });

    if (error) {
      // 23505 = unique_violation — already on the list, that's fine.
      if ((error as { code?: string }).code === "23505") {
        return { ok: true as const, alreadyOnList: true };
      }
      console.error("early_access_signups insert error:", error);
      throw new Error("Could not save signup. Please try again.");
    }

    return { ok: true as const, alreadyOnList: false };
  });
