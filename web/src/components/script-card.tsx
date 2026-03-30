"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Script = {
  id: number;
  personaId: number;
  ideaId: number | null;
  pillarId: number | null;
  platformTarget: string | null;
  hook: string | null;
  openingLine: string | null;
  bodyBeats: string | null;
  proofDemoBeat: string | null;
  ctaClosingBeat: string | null;
  estimatedDuration: number | null;
  visualPlan: string | null;
  captionIdeas: string | null;
  hashtags: string | null;
  experimentMetadata: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  generated: "secondary",
  approved_for_production: "default",
  rejected: "destructive",
  in_production: "outline",
  produced: "default",
};

export function ScriptCard({ script }: { script: Script }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function doAction(actionName: string) {
    setLoadingAction(actionName);
    try {
      await fetch(`/api/scripts/${script.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  const bodyBeats = parseJson<string[]>(script.bodyBeats, []);
  const visualPlan = parseJson<Record<string, unknown>>(script.visualPlan, {});
  const captionIdeas = parseJson<string[]>(script.captionIdeas, []);
  const hashtags = parseJson<string[]>(script.hashtags, []);
  const meta = parseJson<Record<string, unknown>>(script.experimentMetadata, {});

  const status = script.status;

  return (
    <div
      className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden"
    >
      {/* Collapsed header — always clickable to toggle */}
      <div
        className="flex items-start justify-between gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-snug line-clamp-2">
            {script.hook ?? "—"}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs text-muted-foreground">
            {script.platformTarget && (
              <span className="capitalize">{script.platformTarget}</span>
            )}
            {script.estimatedDuration != null && (
              <span>{script.estimatedDuration}s</span>
            )}
            <span className="font-mono">{script.createdAt.slice(0, 10)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={STATUS_COLORS[status] ?? "outline"}>{status}</Badge>
          <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4 text-sm">
          {/* Hook */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Hook</h3>
            <p className="text-base font-semibold">{script.hook ?? "—"}</p>
          </section>

          {/* Opening Line */}
          {script.openingLine && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Opening Line</h3>
              <p>{script.openingLine}</p>
            </section>
          )}

          {/* Body Beats */}
          {bodyBeats.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Body Beats</h3>
              <ol className="list-decimal list-inside space-y-1">
                {bodyBeats.map((beat, i) => (
                  <li key={i}>{beat}</li>
                ))}
              </ol>
            </section>
          )}

          {/* Proof / Demo Beat */}
          {script.proofDemoBeat && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Proof / Demo Beat</h3>
              <p>{script.proofDemoBeat}</p>
            </section>
          )}

          {/* CTA / Closing Beat */}
          {script.ctaClosingBeat && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">CTA / Closing Beat</h3>
              <p>{script.ctaClosingBeat}</p>
            </section>
          )}

          {/* Visual Plan */}
          {Object.keys(visualPlan).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Visual Plan</h3>
              <div className="space-y-1 text-xs">
                {typeof visualPlan.talkingHeadPercent === "number" && (
                  <p><span className="font-medium">Talking head:</span> {visualPlan.talkingHeadPercent}%</p>
                )}
                {Array.isArray(visualPlan.overlayTypes) && (visualPlan.overlayTypes as string[]).length > 0 && (
                  <p><span className="font-medium">Overlays:</span> {(visualPlan.overlayTypes as string[]).join(", ")}</p>
                )}
                {Array.isArray(visualPlan.bRollSuggestions) && (visualPlan.bRollSuggestions as string[]).length > 0 && (
                  <div>
                    <span className="font-medium">B-roll:</span>
                    <ul className="list-disc list-inside mt-0.5">
                      {(visualPlan.bRollSuggestions as string[]).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Caption Ideas */}
          {captionIdeas.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Caption Ideas</h3>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                {captionIdeas.map((c, i) => <li key={i}>{c}</li>)}
              </ol>
            </section>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Hashtags</h3>
              <p className="text-xs text-muted-foreground">{hashtags.join(" ")}</p>
            </section>
          )}

          {/* Metadata */}
          {Object.keys(meta).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Metadata</h3>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {typeof meta.format === "string" && <span><span className="font-medium">Format:</span> {meta.format}</span>}
                {typeof meta.hookType === "string" && <span><span className="font-medium">Hook type:</span> {meta.hookType}</span>}
                {typeof meta.ctaType === "string" && <span><span className="font-medium">CTA type:</span> {meta.ctaType}</span>}
                {script.estimatedDuration != null && <span><span className="font-medium">Duration:</span> {script.estimatedDuration}s</span>}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Action bar — always visible at the bottom */}
      {(status === "generated" ||
        status === "approved_for_production" ||
        status === "rejected") && (
        <div className="border-t px-4 py-2.5 flex gap-2 bg-muted/20">
          {status === "generated" && (
            <>
              <Button
                size="sm"
                variant="default"
                disabled={loadingAction !== null}
                onClick={(e) => { e.stopPropagation(); doAction("approve"); }}
              >
                {loadingAction === "approve" ? "…" : "✓ Approve"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={loadingAction !== null}
                onClick={(e) => { e.stopPropagation(); doAction("reject"); }}
              >
                {loadingAction === "reject" ? "…" : "✗ Reject"}
              </Button>
            </>
          )}
          {status === "approved_for_production" && (
            <>
              <Button
                size="sm"
                variant="default"
                disabled={loadingAction !== null}
                onClick={(e) => { e.stopPropagation(); doAction("send_to_production"); }}
              >
                {loadingAction === "send_to_production" ? "…" : "→ Send to Production"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={loadingAction !== null}
                onClick={(e) => { e.stopPropagation(); doAction("reject"); }}
              >
                {loadingAction === "reject" ? "…" : "✗ Reject"}
              </Button>
            </>
          )}
          {status === "rejected" && (
            <Button
              size="sm"
              variant="outline"
              disabled={loadingAction !== null}
              onClick={(e) => { e.stopPropagation(); doAction("restore"); }}
            >
              {loadingAction === "restore" ? "…" : "↩ Restore"}
            </Button>
          )}
        </div>
      )}
      {(status === "in_production" || status === "produced") && (
        <div className="border-t px-4 py-2.5 bg-muted/20">
          <Badge variant={STATUS_COLORS[status] ?? "outline"}>{status}</Badge>
        </div>
      )}
    </div>
  );
}
