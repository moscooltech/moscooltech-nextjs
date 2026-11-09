import { z } from "zod";
import { db } from "@/db";
import { schema } from "@/db";
import { clientIp, consume } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const Payload = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(100),
  email: z.string().trim().email("Please provide a valid email address.").max(150),
  phone: z.string().trim().max(20).optional().default(""),
  service_needed: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(10, "Please describe the job briefly.").max(2000),
  company_website: z.string().optional().default(""),
  "cf-turnstile-response": z.string().optional().default(""),
});

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }

  const parsed = Payload.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Please check the form." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Honeypot: a filled hidden field is a bot. Pretend success so it retries.
  if (data.company_website) return Response.json({ ok: true });

  const ip = clientIp(request);
  const limit = await consume(`contact:${ip}`, 5, 900);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many messages from this connection. Please call us instead." },
      { status: 429 },
    );
  }

  const turnstile = await verifyTurnstile(data["cf-turnstile-response"] || null, ip);
  if (!turnstile.ok) {
    return Response.json(
      { error: "Spam check failed. Please reload the page and try again." },
      { status: 400 },
    );
  }

  try {
    await db().insert(schema.contactSubmissions).values({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      serviceNeeded: data.service_needed || null,
      message: data.message,
    });
  } catch {
    // Never lose a lead silently in the UI: tell the visitor to call instead.
    return Response.json(
      { error: "We couldn't save your message. Please call or WhatsApp us." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
