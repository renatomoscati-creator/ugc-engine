import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GenerateBatchButton } from "./components/generate-batch-button";
import { ScriptActions } from "./components/script-actions";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  generated: "secondary",
  approved_for_production: "default",
  rejected: "destructive",
  in_production: "outline",
  produced: "default",
};

export default async function ScriptsPage() {
  const db = getDb();
  const allScripts = db
    .select({
      id: scripts.id,
      hook: scripts.hook,
      platformTarget: scripts.platformTarget,
      estimatedDuration: scripts.estimatedDuration,
      status: scripts.status,
      createdAt: scripts.createdAt,
    })
    .from(scripts)
    .orderBy(desc(scripts.createdAt))
    .limit(100)
    .all();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scripts</h1>
          <p className="text-sm text-muted-foreground">{allScripts.length} scripts</p>
        </div>
        <GenerateBatchButton />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hook</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allScripts.map((script) => (
            <TableRow key={script.id}>
              <TableCell className="max-w-xs truncate font-medium">
                {script.hook ?? "—"}
              </TableCell>
              <TableCell className="capitalize">{script.platformTarget ?? "—"}</TableCell>
              <TableCell>{script.estimatedDuration}s</TableCell>
              <TableCell>
                <Badge variant={STATUS_COLORS[script.status] ?? "outline"}>
                  {script.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {script.createdAt}
              </TableCell>
              <TableCell className="text-right">
                <ScriptActions scriptId={script.id} status={script.status} />
              </TableCell>
            </TableRow>
          ))}
          {allScripts.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No scripts yet. Generate ideas first, then generate scripts.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
