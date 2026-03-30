import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamp = () =>
  text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`);

const updatedAt = () =>
  text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`);

// --- Core entities ---

export const personas = sqliteTable("personas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  niche: text("niche"),
  voiceTone: text("voice_tone"),
  visualStyle: text("visual_style"),
  bannedClaims: text("banned_claims"), // JSON array
  identityPackPath: text("identity_pack_path"),
  automationConfig: text("automation_config"), // JSON
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

export const platforms = sqliteTable("platforms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // tiktok, instagram, youtube
  displayName: text("display_name").notNull(),
  exportConfig: text("export_config"), // JSON: resolution, aspect ratio, max duration
  defaultFrequencyCap: integer("default_frequency_cap").default(3),
});

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  platformId: integer("platform_id")
    .notNull()
    .references(() => platforms.id),
  handle: text("handle"),
  apiCredentials: text("api_credentials"), // JSON, encrypted later
  frequencyCap: integer("frequency_cap"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: timestamp(),
});

export const contentPillars = sqliteTable("content_pillars", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  name: text("name").notNull(),
  description: text("description"),
  promptGuidance: text("prompt_guidance"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: timestamp(),
});

export const ideas = sqliteTable("ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  pillarId: integer("pillar_id").references(() => contentPillars.id),
  topic: text("topic").notNull(),
  angle: text("angle"),
  hookSketch: text("hook_sketch"),
  status: text("status").notNull().default("generated"), // generated/approved/rejected/scripted
  fitScore: integer("fit_score"), // 0-100, null if not scored
  fitReason: text("fit_reason"), // 1-sentence explanation from model
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

export const scripts = sqliteTable("scripts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  ideaId: integer("idea_id").references(() => ideas.id),
  pillarId: integer("pillar_id").references(() => contentPillars.id),
  platformTarget: text("platform_target"),
  hook: text("hook"),
  openingLine: text("opening_line"),
  bodyBeats: text("body_beats"), // JSON array
  proofDemoBeat: text("proof_demo_beat"),
  ctaClosingBeat: text("cta_closing_beat"),
  estimatedDuration: integer("estimated_duration"), // seconds
  visualPlan: text("visual_plan"), // JSON
  captionIdeas: text("caption_ideas"), // JSON array
  hashtags: text("hashtags"), // JSON array
  experimentMetadata: text("experiment_metadata"), // JSON
  status: text("status").notNull().default("generated"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

export const scriptVariants = sqliteTable("script_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scriptId: integer("script_id")
    .notNull()
    .references(() => scripts.id),
  variantType: text("variant_type").notNull(), // hook/cta/opening
  content: text("content").notNull(),
  createdAt: timestamp(),
});

export const productionJobs = sqliteTable("production_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scriptId: integer("script_id")
    .notNull()
    .references(() => scripts.id),
  stage: text("stage").notNull(), // tts/animation/composition/encode
  status: text("status").notNull().default("pending"),
  bullmqJobId: text("bullmq_job_id"),
  inputPath: text("input_path"),
  outputPath: text("output_path"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  durationMs: integer("duration_ms"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scriptId: integer("script_id")
    .notNull()
    .references(() => scripts.id),
  productionJobId: integer("production_job_id").references(
    () => productionJobs.id
  ),
  assetType: text("asset_type").notNull(), // audio/animation/video/thumbnail
  filePath: text("file_path").notNull(),
  durationSeconds: real("duration_seconds"),
  fileSizeBytes: integer("file_size_bytes"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp(),
});

export const assetVariants = sqliteTable("asset_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id),
  variantType: text("variant_type").notNull(), // caption_style/cta_ending/first_frame
  filePath: text("file_path").notNull(),
  metadata: text("metadata"), // JSON
  createdAt: timestamp(),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id),
  scriptId: integer("script_id").references(() => scripts.id),
  platformPostId: text("platform_post_id"),
  caption: text("caption"),
  hashtags: text("hashtags"), // JSON array
  hookType: text("hook_type"),
  format: text("format"),
  durationBucket: text("duration_bucket"),
  ctaType: text("cta_type"),
  postingTimeBucket: text("posting_time_bucket"),
  visualTemplate: text("visual_template"),
  voiceType: text("voice_type"),
  subtitleStyle: text("subtitle_style"),
  status: text("status").notNull().default("scheduled"),
  scheduledAt: text("scheduled_at"),
  postedAt: text("posted_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp(),
});

export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  postId: integer("post_id").references(() => posts.id),
  scheduledAt: text("scheduled_at").notNull(),
  status: text("status").notNull().default("pending"), // pending/posted/failed/cancelled
  createdAt: timestamp(),
});

export const experiments = sqliteTable("experiments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  name: text("name").notNull(),
  description: text("description"),
  variable: text("variable").notNull(), // posting_time/hook/template/cta
  status: text("status").notNull().default("active"),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  createdAt: timestamp(),
});

export const experimentAssignments = sqliteTable("experiment_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  experimentId: integer("experiment_id")
    .notNull()
    .references(() => experiments.id),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id),
  arm: text("arm").notNull(), // control/variant_a/variant_b
  createdAt: timestamp(),
});

export const performanceSnapshots = sqliteTable("performance_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  views: integer("views"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  saves: integer("saves"),
  reach: integer("reach"),
  impressions: integer("impressions"),
  watchTimeSeconds: real("watch_time_seconds"),
  avgWatchPercent: real("avg_watch_percent"),
  followerConversions: integer("follower_conversions"),
  clicks: integer("clicks"),
  rawData: text("raw_data"), // JSON: full API response
  snapshotAt: text("snapshot_at").notNull(),
  createdAt: timestamp(),
});

export const recommendations = sqliteTable("recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  type: text("type").notNull(), // weekly_retro/content_suggestion/posting_time/niche_research
  title: text("title").notNull(),
  content: text("content").notNull(), // Markdown
  actionable: integer("actionable", { mode: "boolean" }).default(true),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: timestamp(),
});

export const systemLogs = sqliteTable("system_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  level: text("level").notNull(), // info/warn/error
  source: text("source").notNull(), // queue name or module name
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON
  createdAt: timestamp(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id").references(() => personas.id),
  key: text("key").notNull(),
  value: text("value").notNull(),
});
