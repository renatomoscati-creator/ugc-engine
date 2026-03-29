import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { productionJobs, scripts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const jobs = db
    .select({
      id: productionJobs.id,
      scriptId: productionJobs.scriptId,
      stage: productionJobs.stage,
      status: productionJobs.status,
      errorMessage: productionJobs.errorMessage,
      retryCount: productionJobs.retryCount,
      durationMs: productionJobs.durationMs,
      createdAt: productionJobs.createdAt,
      scriptHook: scripts.hook,
    })
    .from(productionJobs)
    .leftJoin(scripts, eq(productionJobs.scriptId, scripts.id))
    .orderBy(desc(productionJobs.createdAt))
    .limit(200)
    .all();

  return NextResponse.json(jobs);
}
