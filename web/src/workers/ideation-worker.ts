import { Worker, Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue/producers";
import { redisConnection } from "@/lib/queue/connection";
import { getDb } from "@/lib/db";
import { ideas, personas, contentPillars } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { batch, generateJSON } from "@/lib/ollama/client";
import { ideaGenerationPrompt, ideaFitScoringPrompt } from "@/lib/ollama/prompts";

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

      // Flatten all generated ideas with their pillar reference
      const allGenerated: Array<{
        topic: string;
        angle: string;
        hookSketch: string;
        pillarId: number;
      }> = [];
      for (let i = 0; i < results.length; i++) {
        const pillar = pillars[i];
        for (const idea of results[i]) {
          allGenerated.push({
            topic: idea.topic,
            angle: idea.angle ?? "",
            hookSketch: idea.hookSketch ?? "",
            pillarId: pillar.id,
          });
        }
      }

      // Pull calibration examples from DB (up to 6 approved, up to 6 human-rejected)
      const approvedExamples = db
        .select({ topic: ideas.topic, angle: ideas.angle, hookSketch: ideas.hookSketch })
        .from(ideas)
        .where(and(eq(ideas.status, "approved"), eq(ideas.personaId, personaId)))
        .limit(6)
        .all()
        .map((r) => ({ topic: r.topic, angle: r.angle ?? "", hookSketch: r.hookSketch ?? "" }));

      const humanRejectedExamples = db
        .select({ topic: ideas.topic, angle: ideas.angle, hookSketch: ideas.hookSketch })
        .from(ideas)
        .where(and(eq(ideas.status, "rejected"), eq(ideas.personaId, personaId)))
        .limit(6)
        .all()
        .map((r) => ({ topic: r.topic, angle: r.angle ?? "", hookSketch: r.hookSketch ?? "" }));

      // Score ideas for persona fit in batches of up to 15
      type ScoreResult = { topic: string; score: number; reason: string };
      const scoreMap = new Map<string, { score: number; reason: string }>();

      try {
        const SCORE_BATCH = 15;
        for (let i = 0; i < allGenerated.length; i += SCORE_BATCH) {
          const chunk = allGenerated.slice(i, i + SCORE_BATCH);
          const scoringPrompt = ideaFitScoringPrompt({
            persona: {
              name: persona.name,
              niche: persona.niche ?? "general",
              voiceTone: persona.voiceTone ?? "casual and engaging",
              targetAudience: "general social media audience",
            },
            ideas: chunk,
            approvedExamples,
            rejectedExamples: humanRejectedExamples,
          });
          const scored = await generateJSON<ScoreResult[]>(scoringPrompt);
          for (const s of scored) {
            scoreMap.set(s.topic, { score: s.score, reason: s.reason });
          }
        }
        console.log(`[ideation-worker] SCORING done, scored=${scoreMap.size}`);
      } catch (err) {
        console.warn(`[ideation-worker] SCORING failed, inserting all as generated:`, (err as Error).message);
      }

      let inserted = 0;
      let autoPassed = 0;
      let autoRejected = 0;

      for (const idea of allGenerated) {
        const scored = scoreMap.get(idea.topic);
        const fitScore = scored ? scored.score : null;
        const fitReason = scored ? scored.reason : null;
        const status = fitScore !== null && fitScore < 70 ? "rejected" : "generated";

        db.insert(ideas).values({
          personaId,
          pillarId: idea.pillarId,
          topic: idea.topic,
          angle: idea.angle,
          hookSketch: idea.hookSketch,
          status,
          fitScore,
          fitReason,
        }).run();
        inserted++;
        if (fitScore !== null && fitScore < 70) autoRejected++;
        else autoPassed++;
      }

      console.log(`[ideation-worker] SCORED: ${autoPassed} passed (>=70), ${autoRejected} auto-rejected (<70)`);
      console.log(`[ideation-worker] DONE inserted=${inserted}`);
      return { inserted, autoPassed, autoRejected };
    },
    { connection: redisConnection, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[ideation-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
