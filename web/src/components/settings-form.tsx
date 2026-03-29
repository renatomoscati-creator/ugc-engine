"use client";

import { useState } from "react";

interface SettingsFormProps {
  defaultValues: Record<string, string>;
}

const FIELDS = [
  { key: "ollama_host", label: "Ollama Host", type: "text" },
  { key: "ollama_model", label: "Ollama Model", type: "text" },
  { key: "daily_idea_count", label: "Daily Idea Count", type: "number" },
  { key: "default_persona_id", label: "Default Persona ID", type: "number" },
] as const;

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [values, setValues] = useState<Record<string, string>>({
    ollama_host: defaultValues.ollama_host ?? "http://localhost:11434",
    ollama_model: defaultValues.ollama_model ?? "qwen3:8b",
    daily_idea_count: defaultValues.daily_idea_count ?? "5",
    default_persona_id: defaultValues.default_persona_id ?? "1",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      await Promise.all(
        FIELDS.map(({ key }) =>
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value: values[key] }),
          })
        )
      );
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {FIELDS.map(({ key, label, type }) => (
        <div key={key} className="space-y-1">
          <label htmlFor={key} className="block text-sm font-medium">
            {label}
          </label>
          <input
            id={key}
            type={type}
            value={values[key]}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save Settings"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-green-600">Settings saved.</span>
        )}
        {status === "error" && (
          <span className="text-sm text-destructive">Failed to save. Try again.</span>
        )}
      </div>
    </form>
  );
}
