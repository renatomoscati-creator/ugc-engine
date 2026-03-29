import { getDb } from "@/lib/db";
import { recommendations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { InsightCard } from "@/components/insight-card";

export default async function RecommendationsPage() {
  const db = getDb();
  const rows = db
    .select()
    .from(recommendations)
    .where(eq(recommendations.personaId, 1))
    .all();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recommendations</h1>
        <p className="text-sm text-muted-foreground">
          AI-generated insights for your creator strategy
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No recommendations yet. Run the weekly retrospective to generate insights.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const type = (["tip", "warning", "opportunity"] as const).includes(
              row.type as "tip" | "warning" | "opportunity"
            )
              ? (row.type as "tip" | "warning" | "opportunity")
              : "tip";
            return (
              <InsightCard
                key={row.id}
                title={row.title}
                body={row.content}
                type={type}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
