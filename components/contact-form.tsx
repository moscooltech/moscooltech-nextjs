"use client";

import { useState } from "react";
import { TurnstileWidget } from "./turnstile-widget";

type State = "idle" | "sending" | "sent" | "error";

export function ContactForm({ siteKey = "" }: { siteKey?: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setState("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: new FormData(form),
        headers: { accept: "application/json" },
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setState("error");
        setMessage(data.error || "Something went wrong. Please call us instead.");
        return;
      }

      setState("sent");
      setMessage("Thank you — we'll get back to you within 2 hours.");
      form.reset();
    } catch {
      setState("error");
      setMessage("Network error. Please call or WhatsApp us instead.");
    }
  }

  if (state === "sent") {
    return (
      <div className="card flex flex-col gap-3 p-7">
        <p className="eyebrow">Message received</p>
        <p className="font-display text-xl font-semibold">{message}</p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="btn-ghost self-start text-sm"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-4 p-6 sm:p-7" noValidate>
      {/* Honeypot: hidden from users, irresistible to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company_website">Company website</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Phone / WhatsApp" name="phone" type="tel" autoComplete="tel" />
        <Field label="Service needed" name="service_needed" placeholder="AC repair, solar, wiring…" />
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">
          What do you need? <span className="text-accent">*</span>
        </span>
        <textarea
          name="message"
          required
          rows={4}
          maxLength={2000}
          placeholder="Unit type, the fault, and when you'd like a visit."
          className="rounded-lg border border-line bg-paper px-3 py-2.5 text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
        />
      </label>

      <TurnstileWidget siteKey={siteKey} action="contact" />

      {state === "error" ? (
        <p role="alert" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state === "sending"} className="btn-primary disabled:opacity-60">
          {state === "sending" ? "Sending…" : "Send message"}
        </button>
        <p className="text-xs text-ink-muted">
          We reply within 2 hours during working hours.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="rounded-lg border border-line bg-paper px-3 py-2.5 text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
      />
    </label>
  );
}
