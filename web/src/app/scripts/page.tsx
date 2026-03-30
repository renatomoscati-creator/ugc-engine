import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { GenerateBatchButton } from "./components/generate-batch-button";
import { ScriptCard } from "@/components/script-card";

export default async function ScriptsPage() {
  const db = getDb();
  const allScripts = db
    .select()
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

      {allScripts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No scripts yet. Generate ideas first, then generate scripts.
        </div>
      ) : (
        <div className="space-y-3">
          {allScripts.map((script) => (
            <ScriptCard key={script.id} script={script} />
          ))}
        </div>
      )}
    </div>
  );
}
