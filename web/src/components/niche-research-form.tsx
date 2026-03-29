"use client";

import { useState } from "react";

interface NicheResearchResult {
  formats: string[];
  hooks: string[];
  optimalLength: number;
  postingFrequency: number;
  audienceProfile: {
    ageRange: string;
    interests: string[];
    incomeLevel: string;
  };
  monetizationPotential: {
    sponsorshipScore: number;
    revenueStreams: string[];
  };
  confidence: number;
}

export function NicheResearchForm() {
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NicheResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!niche.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/niche-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, platform }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json() as NicheResearchResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
        <input
          type="text"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. personal finance, fitness, cooking"
          className="flex-1 min-w-48 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Researching..." : "Research Niche"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {result && (
        <div className="rounded-lg border bg-card p-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Optimal Length</p>
              <p className="mt-1 font-semibold">{result.optimalLength}s</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Posts/Week</p>
              <p className="mt-1 font-semibold">{result.postingFrequency}x</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Audience</p>
              <p className="mt-1 font-semibold">{result.audienceProfile.ageRange}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Sponsor Score</p>
              <p className="mt-1 font-semibold">{result.monetizationPotential.sponsorshipScore}/10</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Top Formats</p>
            <div className="flex flex-wrap gap-1">
              {result.formats.map((f) => (
                <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-xs">{f}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Hook Patterns</p>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              {result.hooks.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Revenue Streams</p>
            <div className="flex flex-wrap gap-1">
              {result.monetizationPotential.revenueStreams.map((r) => (
                <span key={r} className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">{r}</span>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Confidence: {Math.round(result.confidence * 100)}%
          </p>
        </div>
      )}
    </div>
  );
}
