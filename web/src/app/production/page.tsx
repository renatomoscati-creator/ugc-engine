import { getDb } from "@/lib/db";
import { productionJobs, scripts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RetryButton } from "./components/retry-button";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  running: "outline",
  completed: "default",
  failed: "destructive",
};

export default async function ProductionPage() {
  const db = getDb();
  const jobs = db
    .select({
      id: productionJobs.id,
      scriptId: productionJobs.scriptId,
      stage: productionJobs.stage,
      status: productionJobs.status,
      errorMessage: productionJobs.errorMessage,
      durationMs: productionJobs.durationMs,
      createdAt: productionJobs.createdAt,
      scriptHook: scripts.hook,
    })
    .from(productionJobs)
    .leftJoin(scripts, eq(productionJobs.scriptId, scripts.id))
    .orderBy(desc(productionJobs.createdAt))
    .limit(100)
    .all();

  const stats = {
    running: jobs.filter((j) => j.status === "running").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    completed: jobs.filter((j) => j.status === "completed").length,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Production</h1>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Running", value: stats.running, color: "text-blue-400" },
          { label: "Completed", value: stats.completed, color: "text-green-400" },
          { label: "Failed", value: stats.failed, color: "text-red-400" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Script</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Error</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="max-w-[200px] truncate font-mono text-xs">
                {job.scriptHook ?? `Script #${job.scriptId}`}
              </TableCell>
              <TableCell className="font-mono text-xs uppercase">{job.stage}</TableCell>
              <TableCell>
                <Badge variant={STATUS_COLORS[job.status] ?? "outline"}>{job.status}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s` : "—"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-xs text-red-400">
                {job.errorMessage ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                {job.status === "failed" && <RetryButton jobId={job.id} />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
