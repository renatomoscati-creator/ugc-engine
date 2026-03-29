import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { SettingsForm } from "@/components/settings-form";

const DEFAULTS: Record<string, string> = {
  ollama_model: "qwen3:8b",
  ollama_host: "http://localhost:11434",
  daily_idea_count: "5",
  default_persona_id: "1",
};

export default async function SettingsPage() {
  const db = getDb();
  const rows = db.select().from(settings).all();
  const stored: Record<string, string> = {};
  for (const row of rows) {
    stored[row.key] = row.value;
  }

  const defaultValues: Record<string, string> = { ...DEFAULTS, ...stored };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your Virtual Creator OS preferences
        </p>
      </div>
      <SettingsForm defaultValues={defaultValues} />
    </div>
  );
}
