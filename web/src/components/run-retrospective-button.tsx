"use client";

import { useState } from "react";

export function RunRetrospectiveButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch("/api/retrospective/run", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const labels = {
    idle: "Run Retrospective",
    loading: "Queuing...",
    done: "Queued!",
    error: "Error — retry",
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {labels[state]}
    </button>
  );
}
