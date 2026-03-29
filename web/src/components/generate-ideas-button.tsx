"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

type JobState = "waiting" | "active" | "completed" | "failed" | "delayed" | "prioritized" | "unknown";

type Status =
  | { phase: "idle" }
  | { phase: "queued"; jobId: string }
  | { phase: "active"; jobId: string }
  | { phase: "completed" }
  | { phase: "failed"; reason: string };

export function GenerateIdeasButton() {
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const [useContext, setUseContext] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  async function pollJob(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        id: string;
        state: JobState;
        progress: unknown;
        result: unknown;
        failedReason: string | null;
      };

      if (data.state === "completed") {
        stopPolling();
        setStatus({ phase: "completed" });
      } else if (data.state === "failed") {
        stopPolling();
        setStatus({ phase: "failed", reason: data.failedReason ?? "Unknown error" });
      } else if (data.state === "active") {
        setStatus({ phase: "active", jobId });
      }
    } catch {
      // keep polling on transient errors
    }
  }

  async function handleClick() {
    setStatus({ phase: "queued", jobId: "" });
    try {
      const res = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ideation", personaId: 1, useContext }),
      });
      if (!res.ok) {
        const text = await res.text();
        setStatus({ phase: "failed", reason: text || "Request failed" });
        return;
      }
      const { jobId } = (await res.json()) as { jobId: string };
      setStatus({ phase: "queued", jobId });
      intervalRef.current = setInterval(() => pollJob(jobId), 2000);
    } catch (err) {
      setStatus({ phase: "failed", reason: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  if (status.phase === "idle") {
    return (
      <div className="flex flex-col items-end gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
          <span>Use approved ideas as style context</span>
          <div
            role="switch"
            aria-checked={useContext}
            onClick={() => setUseContext((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useContext ? "bg-primary" : "bg-input"}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${useContext ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </div>
        </label>
        <Button onClick={handleClick}>
          <Sparkles className="h-4 w-4" />
          Generate Ideas
        </Button>
      </div>
    );
  }

  if (status.phase === "queued") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
        ⏳ Queued — waiting for worker...
      </span>
    );
  }

  if (status.phase === "active") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
        <Loader2 className="h-4 w-4 animate-spin" />
        ⚡ Generating ideas...
      </span>
    );
  }

  if (status.phase === "completed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
        ✅ Done! Refresh to see ideas.
        <button
          className="ml-2 underline"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </span>
    );
  }

  // failed
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
      ❌ Failed: {status.reason}
      <button
        className="ml-2 underline"
        onClick={() => setStatus({ phase: "idle" })}
      >
        Retry
      </button>
    </span>
  );
}
