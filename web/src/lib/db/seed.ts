import { getDb } from "./index";
import { personas, platforms, contentPillars } from "./schema";

async function seed() {
  const db = getDb();

  // Seed platforms
  const existingPlatforms = db.select().from(platforms).all();
  if (existingPlatforms.length === 0) {
    db.insert(platforms)
      .values([
        {
          name: "tiktok",
          displayName: "TikTok",
          exportConfig: JSON.stringify({
            resolution: "1080x1920",
            aspectRatio: "9:16",
            maxDuration: 60,
            format: "mp4",
          }),
          defaultFrequencyCap: 3,
        },
        {
          name: "instagram",
          displayName: "Instagram Reels",
          exportConfig: JSON.stringify({
            resolution: "1080x1920",
            aspectRatio: "9:16",
            maxDuration: 90,
            format: "mp4",
          }),
          defaultFrequencyCap: 2,
        },
        {
          name: "youtube",
          displayName: "YouTube Shorts",
          exportConfig: JSON.stringify({
            resolution: "1080x1920",
            aspectRatio: "9:16",
            maxDuration: 60,
            format: "mp4",
          }),
          defaultFrequencyCap: 3,
        },
      ])
      .run();
    console.log("Seeded platforms");
  }

  // Seed default persona
  const existingPersonas = db.select().from(personas).all();
  if (existingPersonas.length === 0) {
    db.insert(personas)
      .values({
        name: "Default Creator",
        automationConfig: JSON.stringify({
          ideation: { mode: "manual", batch_size: 10, cron: "0 6 * * *" },
          script_gen: { mode: "manual" },
          asset_production: { mode: "manual" },
          qa_review: { mode: "manual" },
          scheduling: { mode: "manual", strategy: "best_time" },
          posting: { mode: "manual" },
          performance_ingest: { mode: "auto", cron: "0 */6 * * *" },
        }),
      })
      .run();
    console.log("Seeded default persona");
  }

  // Seed content pillars for persona 1
  const existingPillars = db.select().from(contentPillars).all();
  if (existingPillars.length === 0) {
    db.insert(contentPillars)
      .values([
        {
          personaId: 1,
          name: "Education",
          description: "Teach something valuable in under 60 seconds",
          promptGuidance: "Focus on surprising facts, common misconceptions, or step-by-step how-tos",
          isActive: true,
        },
        {
          personaId: 1,
          name: "Entertainment",
          description: "Pure entertainment — trends, skits, relatable moments",
          promptGuidance: "Hook in first 2 seconds, high energy, funny or emotionally resonant",
          isActive: true,
        },
        {
          personaId: 1,
          name: "Inspiration",
          description: "Motivational content, transformation stories, mindset shifts",
          promptGuidance: "Start with a bold claim or question, end with a clear takeaway",
          isActive: true,
        },
        {
          personaId: 1,
          name: "Product / Promo",
          description: "Soft sell or review content around products or services",
          promptGuidance: "Show don't tell, focus on the outcome for the viewer",
          isActive: true,
        },
      ])
      .run();
    console.log("Seeded content pillars");
  }

  console.log("Seed complete");
}

seed();
