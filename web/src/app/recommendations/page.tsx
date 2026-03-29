import { getDb } from "@/lib/db";
import { recommendations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { InsightCard } from "@/components/insight-card";
import { RunRetrospectiveButton } from "@/components/run-retrospective-button";

const VALID_TYPES = ["tip", "warning", "opportunity"] as const;
type RecoType = (typeof VALID_TYPES)[number];

function normalizeType(t: string): RecoType {
  return (VALID_TYPES as readonly string[]).includes(t) ? (t as RecoType) : "tip";
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeFilter } = await searchParams;
  const db = getDb();

  const rows = db
    .select()
    .from(recommendations)
    .where(eq(recommendations.personaId, 1))
    .all();

  const filtered = typeFilter
    ? rows.filter((r) => r.type === typeFilter)
    : rows;

  // Group by type
  const groups: Record<RecoType, typeof filtered> = { tip: [], warning: [], opportunity: [] };
  for (const row of filtered) {
    const t = normalizeType(row.type);
    groups[t].push(row);
  }

  const groupMeta: { key: RecoType; label: string }[] = [
    { key: "warning", label: "Warnings" },
    { key: "opportunity", label: "Opportunities" },
    { key: "tip", label: "Tips" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recommendations</h1>
          <p className="text-sm text-muted-foreground">
            AI-generated insights for your creator strategy
          </p>
        </div>
        <RunRetrospectiveButton />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[undefined, ...VALID_TYPES].map((t) => (
          <a
            key={t ?? "all"}
            href={t ? `?type=${t}` : "?"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === t || (!typeFilter && !t)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t ? t.charAt(0).toUpperCase() + t.slice(1) : "All"}
          </a>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No recommendations yet. Run the weekly retrospective to generate insights.
        </p>
      ) : (
        <div className="space-y-8">
          {groupMeta.map(({ key, label }) =>
            groups[key].length === 0 ? null : (
              <section key={key}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </h2>
                <div className="space-y-3">
                  {groups[key].map((row) => (
                    <InsightCard
                      key={row.id}
                      title={row.title}
                      body={row.content}
                      type={normalizeType(row.type)}
                    />
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}
    </div>
  );
}
