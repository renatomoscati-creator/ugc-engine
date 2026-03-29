import { Worker, Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue/producers";
import { redisConnection } from "@/lib/queue/connection";
import { getDb } from "@/lib/db";
import { ideas, personas, contentPillars } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { batch } from "@/lib/ollama/client";
import { ideaGenerationPrompt } from "@/lib/ollama/prompts";

interface IdeationJobData {
  personaId: number;
  pillarId?: number;
  count?: number;
  existingContext?: Array<{ topic: string; angle: string; hookSketch: string }>;
  userGuidance?: string;
}

export function startIdeationWorker() {
  const worker = new Worker<IdeationJobData>(
    QUEUE_NAMES.IDEATION,
    async (job: Job<IdeationJobData>) => {
      console.log(`[ideation-worker] START jobId=${job.id}`);
      const db = getDb();
      const { personaId, pillarId, count = 10, existingContext, userGuidance } = job.data;

      const persona = db
        .select()
        .from(personas)
        .where(eq(personas.id, personaId))
        .get();
      if (!persona) throw new Error(`Persona ${personaId} not found`);

      const pillars = pillarId
        ? db.select().from(contentPillars).where(
            and(eq(contentPillars.id, pillarId), eq(contentPillars.personaId, personaId))
          ).all()
        : db.select().from(contentPillars).where(
            and(eq(contentPillars.personaId, personaId), eq(contentPillars.isActive, true))
          ).all();

      if (!pillars.length) throw new Error("No active pillars found");

      const perPillar = Math.ceil(count / pillars.length);
      const bannedClaims: string[] = persona.bannedClaims
        ? JSON.parse(persona.bannedClaims)
        : [];

      // Pull ALL rejected ideas to explicitly avoid their topics and angles
      const rejectedIdeas = db
        .select({ topic: ideas.topic, angle: ideas.angle, hookSketch: ideas.hookSketch })
        .from(ideas)
        .where(and(eq(ideas.status, "rejected"), eq(ideas.personaId, personaId)))
        .all()
        .map((r) => ({ topic: r.topic, angle: r.angle ?? "", hookSketch: r.hookSketch ?? "" }));

      // Pull ALL existing (generated + approved) topics to avoid repeats
      const allExistingTopics = db
        .select({ topic: ideas.topic })
        .from(ideas)
        .where(eq(ideas.personaId, personaId))
        .all()
        .map((r) => r.topic)
        .filter(Boolean) as string[];

      const prompts = pillars.map((pillar) =>
        ideaGenerationPrompt({
          personaName: persona.name,
          niche: persona.niche ?? "general",
          voiceTone: persona.voiceTone ?? "casual and engaging",
          pillarName: pillar.name,
          pillarDescription: pillar.description ?? "",
          bannedClaims,
          count: perPillar,
          existingApproved: existingContext,
          rejectedIdeas,
          existingTopics: allExistingTopics,
          userGuidance,
          // Inject a random seed phrase so the model doesn't cache its own pattern
          entropySeed: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })
      );

      const results = await batch<{ topic: string; angle: string; hookSketch: string }[]>(
        prompts,
        { temperature: 0.85 } // high enough to break repetition, low enough to stay coherent
      );

      let inserted = 0;
      for (let i = 0; i < results.length; i++) {
        const pillar = pillars[i];
        for (const idea of results[i]) {
          db.insert(ideas).values({
            personaId,
            pillarId: pillar.id,
            topic: idea.topic,
            angle: idea.angle,
            hookSketch: idea.hookSketch,
            status: "generated",
          }).run();
          inserted++;
        }
      }

      console.log(`[ideation-worker] DONE inserted=${inserted}`);
      return { inserted };
    },
    { connection: redisConnection, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[ideation-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
