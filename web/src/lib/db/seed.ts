import { getDb } from "./index";
import { personas, platforms } from "./schema";

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

  console.log("Seed complete");
}

seed();
