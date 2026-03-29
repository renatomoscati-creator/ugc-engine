import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import {
  getTopLineMetrics,
  getPillarBreakdown,
  getHookPerformance,
  getPipelineHealth,
} from "@/lib/analytics";

const DEFAULT_PERSONA_ID = 1;

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "pillars", label: "Pillars" },
  { key: "hooks", label: "Hooks" },
  { key: "pipeline", label: "Pipeline" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const rawTab = resolvedParams["tab"];
  const tab: TabKey =
    typeof rawTab === "string" && TABS.some((t) => t.key === rawTab)
      ? (rawTab as TabKey)
      : "overview";

  const [topLine, pillars, hooks, pipeline] = await Promise.all([
    getTopLineMetrics(DEFAULT_PERSONA_ID),
    getPillarBreakdown(DEFAULT_PERSONA_ID),
    getHookPerformance(DEFAULT_PERSONA_ID),
    getPipelineHealth(DEFAULT_PERSONA_ID),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Performance overview for your virtual creator
        </p>
      </div>

      {/* Tab nav */}
      <nav className="flex gap-1 border-b">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/analytics?tab=${key}`}
            className={[
              "px-4 py-2 text-sm font-medium rounded-t transition-colors",
              tab === key
                ? "border border-b-background -mb-px bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total Posts" value={topLine.totalPosts} />
          <KpiCard label="Total Views" value={topLine.totalViews.toLocaleString()} />
          <KpiCard label="Posts This Week" value={topLine.weeklyPostCount} />
          <KpiCard
            label="Follower Growth"
            value={topLine.followerGrowth}
            unit="%"
          />
        </div>
      )}

      {tab === "pillars" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 text-left font-medium">Pillar</th>
                <th className="py-2 text-right font-medium">Posts</th>
                <th className="py-2 text-right font-medium">Avg Views</th>
              </tr>
            </thead>
            <tbody>
              {pillars.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No pillar data yet.
                  </td>
                </tr>
              ) : (
                pillars.map((p) => (
                  <tr key={p.pillarName} className="border-b last:border-0">
                    <td className="py-2 font-medium">{p.pillarName}</td>
                    <td className="py-2 text-right">{p.postCount}</td>
                    <td className="py-2 text-right">
                      {p.avgViews.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "hooks" && (
        <div className="space-y-2">
          {hooks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hook data yet.
            </p>
          ) : (
            [...hooks]
              .sort((a, b) => b.avgViews - a.avgViews)
              .map((h) => (
                <div
                  key={h.hookType}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <span className="font-medium capitalize">{h.hookType}</span>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span>{h.count} posts</span>
                    <span>{h.avgViews.toLocaleString()} avg views</span>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {tab === "pipeline" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Queued / Running" value={pipeline.queuedCount} />
          <KpiCard label="Completed" value={pipeline.completedCount} />
          <KpiCard label="Failed" value={pipeline.failedCount} />
          <KpiCard
            label="Avg Job Duration"
            value={pipeline.avgJobDurationMs.toLocaleString()}
            unit="ms"
          />
        </div>
      )}
    </div>
  );
}
