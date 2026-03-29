"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

type JobState =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "prioritized"
  | "unknown";

type ScriptStatus =
  | { phase: "idle" }
  | { phase: "queued"; jobsCount: number }
  | { phase: "done" }
  | { phase: "failed"; reason: string };

type IdeaStatus =
  | { phase: "idle" }
  | { phase: "queued"; jobId: string }
  | { phase: "active"; jobId: string }
  | { phase: "completed" }
  | { phase: "failed"; reason: string };

export function GenerateBatchButton() {
  const [ideaStatus, setIdeaStatus] = useState<IdeaStatus>({ phase: "idle" });
  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>({ phase: "idle" });
  const [loading, setLoading] = useState(false);
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
        setIdeaStatus({ phase: "completed" });
        setLoading(false);
      } else if (data.state === "failed") {
        stopPolling();
        setIdeaStatus({ phase: "failed", reason: data.failedReason ?? "Unknown error" });
        setLoading(false);
      } else if (data.state === "active") {
        setIdeaStatus({ phase: "active", jobId });
      }
    } catch {
      // keep polling on transient errors
    }
  }

  async function handleGenerateIdeas() {
    if (loading) return;
    setLoading(true);
    setIdeaStatus({ phase: "queued", jobId: "" });
    try {
      const res = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ideas", personaId: 1, count: 10 }),
      });
      const data = (await res.json()) as { jobId?: string };
      if (!res.ok || !data.jobId) {
        setIdeaStatus({ phase: "failed", reason: "Request failed" });
        setLoading(false);
        return;
      }
      setIdeaStatus({ phase: "queued", jobId: data.jobId });
      intervalRef.current = setInterval(() => pollJob(data.jobId!), 2000);
    } catch (err) {
      setIdeaStatus({
        phase: "failed",
        reason: err instanceof Error ? err.message : "Unknown error",
      });
      setLoading(false);
    }
  }

  async function handleGenerateScripts() {
    if (loading) return;
    setLoading(true);
    setScriptStatus({ phase: "queued", jobsCount: 0 });
    try {
      const res = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "scripts", personaId: 1 }),
      });
      const data = (await res.json()) as { jobsQueued?: number };
      if (!res.ok) {
        setScriptStatus({ phase: "failed", reason: "Request failed" });
        setLoading(false);
        return;
      }
      setScriptStatus({ phase: "done" });
    } catch (err) {
      setScriptStatus({
        phase: "failed",
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  const ideaPhase = ideaStatus.phase;
  const scriptPhase = scriptStatus.phase;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleGenerateIdeas}
          disabled={loading}
        >
          {ideaPhase === "active" || (ideaPhase === "queued" && loading) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate Ideas
        </Button>
        <Button onClick={handleGenerateScripts} disabled={loading}>
          {scriptPhase === "queued" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Generate Scripts
        </Button>
      </div>

      {ideaPhase === "queued" && (
        <span className="text-xs text-amber-700">⏳ Ideas job queued...</span>
      )}
      {ideaPhase === "active" && (
        <span className="text-xs text-blue-700">⚡ Generating ideas...</span>
      )}
      {ideaPhase === "completed" && (
        <span className="text-xs text-green-700">
          ✅ Ideas done!{" "}
          <button className="underline" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </span>
      )}
      {ideaPhase === "failed" && (
        <span className="text-xs text-red-700">
          ❌ Ideas failed:{" "}
          {"reason" in ideaStatus ? ideaStatus.reason : ""}
          <button
            className="ml-1 underline"
            onClick={() => { setIdeaStatus({ phase: "idle" }); setLoading(false); }}
          >
            Retry
          </button>
        </span>
      )}

      {scriptPhase === "queued" && (
        <span className="text-xs text-amber-700">⏳ Queuing script jobs...</span>
      )}
      {scriptPhase === "done" && (
        <span className="text-xs text-green-700">
          ✅ Scripts queued!{" "}
          <button className="underline" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </span>
      )}
      {scriptPhase === "failed" && (
        <span className="text-xs text-red-700">
          ❌ Scripts failed:{" "}
          {"reason" in scriptStatus ? scriptStatus.reason : ""}
          <button
            className="ml-1 underline"
            onClick={() => { setScriptStatus({ phase: "idle" }); setLoading(false); }}
          >
            Retry
          </button>
        </span>
      )}
    </div>
  );
}
