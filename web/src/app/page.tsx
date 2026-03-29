import { getDb } from "@/lib/db";
import { productionJobs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getTopLineMetrics, getPipelineHealth } from "@/lib/analytics";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function OverviewPage() {
  const db = getDb();

  let topLine = { totalPosts: 0, totalViews: 0, weeklyPostCount: 0, followerGrowth: 0 };
  let health = { queuedCount: 0, completedCount: 0, failedCount: 0, avgJobDurationMs: 0 };
  let recentJobs: Array<{ id: number; stage: string; status: string; createdAt: string; durationMs: number | null }> = [];

  try {
    topLine = await getTopLineMetrics(1);
    health = await getPipelineHealth(1);
    recentJobs = db
      .select({
        id: productionJobs.id,
        stage: productionJobs.stage,
        status: productionJobs.status,
        createdAt: productionJobs.createdAt,
        durationMs: productionJobs.durationMs,
      })
      .from(productionJobs)
      .orderBy(desc(productionJobs.createdAt))
      .limit(10)
      .all();
  } catch {
    // empty state
  }

  const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    running: "outline",
    completed: "default",
    failed: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">Local-first Virtual Creator OS</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Posts" value={topLine.totalPosts} />
        <KpiCard label="Total Views" value={topLine.totalViews} />
        <KpiCard label="Weekly Posts" value={topLine.weeklyPostCount} />
        <KpiCard label="Pipeline Queued" value={health.queuedCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Queued", value: health.queuedCount, color: "text-blue-400" },
          { label: "Completed", value: health.completedCount, color: "text-green-400" },
          { label: "Failed", value: health.failedCount, color: "text-red-400" },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Pipeline Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No jobs yet. Send a script to production to get started.
                  </TableCell>
                </TableRow>
              ) : (
                recentJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs uppercase">{job.stage}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[job.status] ?? "outline"}>{job.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{job.createdAt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
