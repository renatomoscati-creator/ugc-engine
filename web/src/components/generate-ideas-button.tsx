"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export function GenerateIdeasButton() {
  const [loading, setLoading] = useState(false);
  const [queued, setQueued] = useState(false);

  async function handleClick() {
    setLoading(true);
    setQueued(false);
    try {
      await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ideation", personaId: 1 }),
      });
      setQueued(true);
      setTimeout(() => setQueued(false), 2500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {queued ? "Queued!" : "Generate Ideas"}
    </Button>
  );
}
