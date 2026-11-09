import { z } from "zod";
import { db, schema } from "@/db";
import { clientIp, consume } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const Payload = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(100),
  email: z.string().trim().email("Please provide a valid email address.").max(150),
  subject: z.string().trim().min(3, "Add a short subject.").max(200),
  message: z.string().trim().min(10, "Please add a little more detail.").max(2000),
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
  if (data.company_website) return Response.json({ ok: true });

  const ip = clientIp(request);
  const limit = await consume(`feedback:${ip}`, 5, 900);
  if (!limit.allowed) {
    return Response.json({ error: "Too many messages from this connection." }, { status: 429 });
  }

  const turnstile = await verifyTurnstile(data["cf-turnstile-response"] || null, ip);
  if (!turnstile.ok) {
    return Response.json({ error: "Spam check failed. Reload and try again." }, { status: 400 });
  }

  try {
    await db().insert(schema.feedbackSubmissions).values({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });
  } catch {
    return Response.json({ error: "Could not save your feedback. Please try later." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
