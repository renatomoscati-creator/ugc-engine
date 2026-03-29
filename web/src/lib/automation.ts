import { getDb } from "@/lib/db";
import { personas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type AutomationStage =
  | "ideation"
  | "script_gen"
  | "asset_production"
  | "qa_review"
  | "scheduling"
  | "posting"
  | "performance_ingest";

export interface StageConfig {
  mode: "manual" | "auto";
  batch_size?: number;
  cron?: string;
  strategy?: string;
}

export type AutomationConfig = Record<AutomationStage, StageConfig>;

const DEFAULT_CONFIG: AutomationConfig = {
  ideation: { mode: "manual", batch_size: 10, cron: "0 6 * * *" },
  script_gen: { mode: "manual" },
  asset_production: { mode: "manual" },
  qa_review: { mode: "manual" },
  scheduling: { mode: "manual", strategy: "best_time" },
  posting: { mode: "manual" },
  performance_ingest: { mode: "auto", cron: "0 */6 * * *" },
};

export function getAutomationConfig(personaId: number): AutomationConfig {
  const db = getDb();
  const persona = db
    .select({ automationConfig: personas.automationConfig })
    .from(personas)
    .where(eq(personas.id, personaId))
    .get();

  if (!persona?.automationConfig) return DEFAULT_CONFIG;

  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(persona.automationConfig) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function isAuto(personaId: number, stage: AutomationStage): boolean {
  return getAutomationConfig(personaId)[stage].mode === "auto";
}
