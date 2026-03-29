import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ollama/client";
import { nicheResearchPrompt } from "@/lib/ollama/prompts";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface NicheResearchResult {
  formats: string[];
  hooks: string[];
  optimalLength: number;
  postingFrequency: number;
  audienceProfile: {
    ageRange: string;
    interests: string[];
    incomeLevel: string;
  };
  monetizationPotential: {
    sponsorshipScore: number;
    revenueStreams: string[];
  };
  confidence: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { niche: string; platform: string };

  if (!body.niche || !body.platform) {
    return NextResponse.json({ error: "Missing niche or platform" }, { status: 400 });
  }

  const prompt = nicheResearchPrompt(body.niche, body.platform);
  const result = await generateJSON<NicheResearchResult>(prompt);

  const db = getDb();
  const key = `niche_research_${body.platform}`;

  // Upsert into settings table
  const existing = db
    .select()
    .from(settings)
    .where(and(eq(settings.key, key), eq(settings.personaId, 1)))
    .get();

  if (existing) {
    db.update(settings)
      .set({ value: JSON.stringify({ niche: body.niche, ...result }) })
      .where(eq(settings.id, existing.id))
      .run();
  } else {
    db.insert(settings)
      .values({ personaId: 1, key, value: JSON.stringify({ niche: body.niche, ...result }) })
      .run();
  }

  return NextResponse.json(result);
}
