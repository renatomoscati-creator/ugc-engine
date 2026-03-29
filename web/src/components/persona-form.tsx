"use client";

import { useState } from "react";

interface PersonaFormProps {
  persona: {
    id: number;
    name: string;
    niche: string | null;
    voiceTone: string | null;
    targetAudience?: string | null;
    bannedClaims: string; // comma-separated
  };
}

export function PersonaForm({ persona }: PersonaFormProps) {
  const [niche, setNiche] = useState(persona.niche ?? "");
  const [voiceTone, setVoiceTone] = useState(persona.voiceTone ?? "");
  const [targetAudience, setTargetAudience] = useState(
    persona.targetAudience ?? ""
  );
  const [bannedClaims, setBannedClaims] = useState(persona.bannedClaims);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const bannedClaimsArray = bannedClaims
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/personas/${persona.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          voiceTone,
          targetAudience,
          bannedClaims: bannedClaimsArray,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <label htmlFor="niche" className="block text-sm font-medium">
          Niche
        </label>
        <input
          id="niche"
          type="text"
          value={niche}
          placeholder="e.g. personal finance for millennials"
          onChange={(e) => setNiche(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="voiceTone" className="block text-sm font-medium">
          Voice &amp; Tone
        </label>
        <input
          id="voiceTone"
          type="text"
          value={voiceTone}
          placeholder="e.g. direct, punchy, slightly sarcastic"
          onChange={(e) => setVoiceTone(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="targetAudience" className="block text-sm font-medium">
          Target Audience
        </label>
        <input
          id="targetAudience"
          type="text"
          value={targetAudience}
          placeholder="e.g. 25-35 year olds building side businesses"
          onChange={(e) => setTargetAudience(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="bannedClaims" className="block text-sm font-medium">
          Banned Claims
        </label>
        <textarea
          id="bannedClaims"
          value={bannedClaims}
          placeholder="e.g. guaranteed returns, get rich quick"
          onChange={(e) => setBannedClaims(e.target.value)}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">Comma-separated list</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save Persona"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-green-600">Persona saved.</span>
        )}
        {status === "error" && (
          <span className="text-sm text-destructive">
            Failed to save. Try again.
          </span>
        )}
      </div>
    </form>
  );
}
