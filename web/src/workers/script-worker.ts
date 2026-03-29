import { Worker, Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue/producers";
import { redisConnection } from "@/lib/queue/connection";
import { getDb } from "@/lib/db";
import { scripts, ideas, personas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateJSON } from "@/lib/ollama/client";
import { scriptGenerationPrompt } from "@/lib/ollama/prompts";
import type { ScriptOutput } from "@/lib/ollama/types";

interface ScriptJobData {
  ideaId: number;
  personaId: number;
  platform?: string;
}

export function startScriptWorker() {
  const worker = new Worker<ScriptJobData>(
    QUEUE_NAMES.SCRIPT_GEN,
    async (job: Job<ScriptJobData>) => {
      console.log(`[script-worker] START jobId=${job.id}`);
      const db = getDb();
      const { ideaId, personaId, platform = "tiktok" } = job.data;

      const idea = db.select().from(ideas).where(eq(ideas.id, ideaId)).get();
      if (!idea) throw new Error(`Idea ${ideaId} not found`);

      const persona = db.select().from(personas).where(eq(personas.id, personaId)).get();
      if (!persona) throw new Error(`Persona ${personaId} not found`);

      const bannedClaims: string[] = persona.bannedClaims
        ? JSON.parse(persona.bannedClaims)
        : [];

      const prompt = scriptGenerationPrompt({
        personaName: persona.name,
        niche: persona.niche ?? "general",
        voiceTone: persona.voiceTone ?? "casual and engaging",
        topic: idea.topic,
        angle: idea.angle ?? "",
        hookSketch: idea.hookSketch ?? "",
        platform,
        bannedClaims,
      });

      const result = await generateJSON<ScriptOutput>(prompt);

      db.insert(scripts).values({
        personaId,
        ideaId,
        platformTarget: platform,
        hook: result.hook,
        openingLine: result.openingLine,
        bodyBeats: JSON.stringify(result.bodyBeats),
        proofDemoBeat: result.proofDemoBeat,
        ctaClosingBeat: result.ctaClosingBeat,
        estimatedDuration: result.estimatedDuration,
        visualPlan: JSON.stringify(result.visualPlan),
        captionIdeas: JSON.stringify(result.captionIdeas),
        hashtags: JSON.stringify(result.hashtags),
        experimentMetadata: JSON.stringify({
          hookType: result.hookType,
          format: result.format,
          ctaType: result.ctaType,
        }),
        status: "generated",
      }).run();

      db.update(ideas).set({ status: "scripted" }).where(eq(ideas.id, ideaId)).run();

      console.log(`[script-worker] DONE ideaId=${ideaId}`);
    },
    { connection: redisConnection, concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[script-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
