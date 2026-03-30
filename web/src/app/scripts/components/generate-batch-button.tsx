"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";

type ScriptPhase =
  | { phase: "idle" }
  | { phase: "queued"; jobIds: string[]; total: number }
  | { phase: "running"; completed: number; total: number; failed: number }
  | { phase: "done"; completed: number; total: number; failed: number }
  | { phase: "failed"; reason: string };

export function GenerateBatchButton() {
  const [scriptStatus, setScriptStatus] = useState<ScriptPhase>({ phase: "idle" });
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  async function pollBatch(jobIds: string[]) {
    try {
      const res = await fetch("/api/jobs/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        total: number;
        completed: number;
        failed: number;
        allDone: boolean;
      };

      if (data.allDone) {
        stopPolling();
        setLoading(false);
        setScriptStatus({ phase: "done", completed: data.completed, total: data.total, failed: data.failed });
      } else {
        setScriptStatus({ phase: "running", completed: data.completed, total: data.total, failed: data.failed });
      }
    } catch {
      // keep polling on transient errors
    }
  }

  async function handleGenerateScripts() {
    if (loading) return;
    setLoading(true);
    setScriptStatus({ phase: "idle" });

    try {
      const res = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "scripts", personaId: 1 }),
      });

      const data = (await res.json()) as { jobIds?: string[]; total?: number; error?: string };

      if (!res.ok) {
        setScriptStatus({ phase: "failed", reason: data.error ?? "Request failed" });
        setLoading(false);
        return;
      }

      const jobIds = data.jobIds ?? [];
      const total = data.total ?? 0;
      setScriptStatus({ phase: "queued", jobIds, total });
      intervalRef.current = setInterval(() => pollBatch(jobIds), 2000);
    } catch (err) {
      setScriptStatus({ phase: "failed", reason: err instanceof Error ? err.message : "Unknown error" });
      setLoading(false);
    }
  }

  const s = scriptStatus;

  return (
    <div className="flex flex-col items-end gap-2">
      {s.phase === "idle" && (
        <Button onClick={handleGenerateScripts} disabled={loading}>
          <FileText className="h-4 w-4" />
          Generate Scripts
        </Button>
      )}

      {s.phase === "queued" && (
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          ⏳ Queued {s.total} script{s.total !== 1 ? "s" : ""}...
        </span>
      )}

      {s.phase === "running" && (
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          ⚡ {s.completed}/{s.total} scripts done{s.failed > 0 ? ` · ${s.failed} failed` : ""}
        </span>
      )}

      {s.phase === "done" && (
        <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          ✅ {s.completed}/{s.total} scripts ready
          {s.failed > 0 && <span className="text-red-700 ml-1">· {s.failed} failed</span>}
          <button className="ml-2 underline" onClick={() => window.location.reload()}>Refresh</button>
          <button className="ml-1 underline" onClick={() => setScriptStatus({ phase: "idle" })}>Again</button>
        </span>
      )}

      {s.phase === "failed" && (
        <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
          ❌ {s.reason}
          <button className="ml-2 underline" onClick={() => { setScriptStatus({ phase: "idle" }); setLoading(false); }}>Retry</button>
        </span>
      )}
    </div>
  );
}
