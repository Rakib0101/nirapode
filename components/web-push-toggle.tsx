"use client";

import { useCallback, useEffect, useState } from "react";

// Turns browser notifications on for this browser. A subscription belongs to
// one browser profile on one machine, so this has to be done once per place
// you use the site — which is why it's a visible control rather than something
// that happens silently at login.

type State = "checking" | "unsupported" | "blocked" | "off" | "on" | "working";

// navigator.serviceWorker.ready never resolves when no worker ends up
// controlling the page — a failed registration leaves it pending forever, and
// this control would sit invisible in its "checking" state with no clue why.
const SW_READY_TIMEOUT_MS = 6000;

async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS)),
  ]);
}

// The VAPID public key travels as base64url; the Push API wants raw bytes.
// Returns the ArrayBuffer rather than a Uint8Array view: Uint8Array is generic
// over its backing buffer in current TypeScript, and the inferred
// ArrayBufferLike isn't assignable to applicationServerKey's BufferSource.
function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

export function WebPushToggle() {
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  // Pure: works out where we stand without touching state, so the effect
  // below never calls setState synchronously.
  const currentState = useCallback(async (): Promise<State> => {
    if (typeof window === "undefined") return "checking";
    // Safari below 16.4, and every browser in a non-secure context, lack this.
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !publicKey) {
      return "unsupported";
    }
    if (Notification.permission === "denied") return "blocked";
    try {
      const reg = await readyRegistration();
      if (!reg) return "unsupported";
      return (await reg.pushManager.getSubscription()) ? "on" : "off";
    } catch {
      return "unsupported";
    }
  }, [publicKey]);

  const refresh = useCallback(async () => {
    setState(await currentState());
  }, [currentState]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await currentState();
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentState]);

  async function enable() {
    setError(null);
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      const reg = await readyRegistration();
      if (!reg) throw new Error("Notifications aren't ready in this browser yet. Reload and try again.");
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          // Chrome refuses a subscription without this, and we always send a
          // payload anyway.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(publicKey as string),
        }));

      const res = await fetch("/api/push/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed");

      setState("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable notifications.");
      await refresh();
    }
  }

  async function disable() {
    setError(null);
    setState("working");
    try {
      const reg = await readyRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push/web", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable notifications.");
      await refresh();
    }
  }

  if (state === "checking") {
    return <p className="text-xs text-muted-foreground">Checking notification support…</p>;
  }

  if (state === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        This browser can&apos;t show notifications. Reminders will still arrive by email.
      </p>
    );
  }

  if (state === "blocked") {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Notifications are blocked for this site. Allow them in your browser&apos;s site settings to get
        reminders here — email still works either way.
      </p>
    );
  }

  const on = state === "on";
  const busy = state === "working";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={on ? disable : enable}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer ${
          on
            ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
            : "bg-brand text-white hover:bg-brand-dark"
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
        </svg>
        {busy ? "Working…" : on ? "Notifications on for this browser" : "Turn on browser notifications"}
      </button>

      {on && (
        <span className="text-[11px] text-muted-foreground">
          Reminders set to <strong>App</strong> or <strong>Both</strong> will pop up here.
        </span>
      )}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
