"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export function GenerateBatchButton() {
  const [loading, setLoading] = useState(false);

  async function handleGenerate(type: "ideas" | "scripts") {
    setLoading(true);
    try {
      const res = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, personaId: 1, count: 10 }),
      });
      const data = await res.json();
      alert(`Queued. Job: ${data.jobId ?? data.jobsQueued + " jobs"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => handleGenerate("ideas")} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate Ideas
      </Button>
      <Button onClick={() => handleGenerate("scripts")} disabled={loading}>
        Generate Scripts
      </Button>
    </div>
  );
}
