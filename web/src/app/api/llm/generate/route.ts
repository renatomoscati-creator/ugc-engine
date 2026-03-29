import { NextResponse } from "next/server";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function POST(req: Request) {
  const { type, personaId, pillarId, count, useContext, userGuidance } = await req.json();

  if (type === "ideation" || type === "ideas") {
    let existingContext: Array<{ topic: string; angle: string; hookSketch: string }> | undefined;
    if (useContext) {
      const { getDb } = await import("@/lib/db");
      const { ideas } = await import("@/lib/db/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = getDb();
      const approved = db
        .select({ topic: ideas.topic, angle: ideas.angle, hookSketch: ideas.hookSketch })
        .from(ideas)
        .where(and(eq(ideas.status, "approved"), eq(ideas.personaId, personaId ?? 1)))
        .limit(8)
        .all();
      if (approved.length > 0) {
        existingContext = approved.map((r) => ({
          topic: r.topic,
          angle: r.angle ?? "",
          hookSketch: r.hookSketch ?? "",
        }));
      }
    }
    const job = await enqueue(QUEUE_NAMES.IDEATION, "generate-ideas", {
      personaId: personaId ?? 1,
      pillarId,
      count: count ?? 10,
      ...(existingContext ? { existingContext } : {}),
      ...(userGuidance ? { userGuidance } : {}),
    });
    return NextResponse.json({ jobId: job.id });
  }

  if (type === "scripts") {
    const { getDb } = await import("@/lib/db");
    const { ideas } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const approvedIdeas = db
      .select()
      .from(ideas)
      .where(eq(ideas.status, "approved"))
      .all();

    const jobs = await Promise.all(
      approvedIdeas.map((idea) =>
        enqueue(QUEUE_NAMES.SCRIPT_GEN, "generate-script", {
          ideaId: idea.id,
          personaId: idea.personaId,
        })
      )
    );
    return NextResponse.json({ jobsQueued: jobs.length });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
