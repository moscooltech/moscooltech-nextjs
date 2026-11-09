"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Renders the Turnstile widget and mirrors its token into a hidden input so the
 * form keeps working without JavaScript state plumbing on the server.
 */
export function TurnstileWidget({ siteKey, action }: { siteKey: string; action: string }) {
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!siteKey || !container.current) return;

    const render = () => {
      if (!window.turnstile || !container.current) return;
      window.turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        theme: "light",
        callback: (token: string) => {
          if (input.current) input.current.value = token;
        },
        "expired-callback": () => {
          if (input.current) input.current.value = "";
        },
      });
    };

    if (window.turnstile) {
      render();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", render);
      return () => existing.removeEventListener("load", render);
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", render);
    document.head.appendChild(script);

    return () => script.removeEventListener("load", render);
  }, [siteKey, action]);

  if (!siteKey) return null;

  return (
    <div>
      <div ref={container} />
      <input ref={input} type="hidden" name="cf-turnstile-response" value="" />
    </div>
  );
}
