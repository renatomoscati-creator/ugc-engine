import { getDb } from "@/lib/db";
import { ideas, contentPillars } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GenerateIdeasButton } from "@/components/generate-ideas-button";
import { IdeaActions } from "@/components/idea-actions";

type StatusFilter = "pending" | "approved" | "rejected" | undefined;

const STATUS_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  generated: "secondary",
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  scripted: "outline",
};

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: "generated" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
] as const;

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; personaId?: string }>;
}) {
  const { status } = await searchParams;

  const db = getDb();

  let query = db
    .select({
      id: ideas.id,
      hookSketch: ideas.hookSketch,
      topic: ideas.topic,
      pillarId: ideas.pillarId,
      status: ideas.status,
      createdAt: ideas.createdAt,
    })
    .from(ideas)
    .orderBy(desc(ideas.createdAt))
    .limit(100);

  let allIdeas: Array<{
    id: number;
    hookSketch: string | null;
    topic: string;
    pillarId: number | null;
    status: string;
    createdAt: string;
  }> = [];

  try {
    const rows = query.all();
    allIdeas = status
      ? rows.filter((r) => r.status === status)
      : rows;
  } catch {
    // empty state
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ideas</h1>
          <p className="text-sm text-muted-foreground">
            {allIdeas.length} idea{allIdeas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <GenerateIdeasButton />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => {
          const href = tab.value ? `/ideas?status=${tab.value}` : "/ideas";
          const isActive = (status ?? undefined) === tab.value;
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hook</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allIdeas.map((idea) => (
            <TableRow key={idea.id}>
              <TableCell className="max-w-xs truncate font-medium">
                {idea.hookSketch ?? "—"}
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">
                {idea.topic}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[idea.status] ?? "outline"}>
                  {idea.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {idea.createdAt}
              </TableCell>
              <TableCell className="text-right">
                <IdeaActions ideaId={idea.id} currentStatus={idea.status} />
              </TableCell>
            </TableRow>
          ))}
          {allIdeas.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                No ideas yet. Click Generate Ideas to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
