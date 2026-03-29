const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
const CONCURRENCY_LIMIT = 3;

interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model ?? OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.response as string;
}

export async function generateJSON<T>(
  prompt: string,
  options: GenerateOptions = {}
): Promise<T> {
  const raw = await generate(prompt, { ...options, temperature: 0.3 });
  const match = raw.match(/```json\n?([\s\S]*?)\n?```/) ?? raw.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error(`No JSON found in response: ${raw.slice(0, 200)}`);
  return JSON.parse(match[1]) as T;
}

export async function batch<T>(
  prompts: string[],
  options: GenerateOptions = {}
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < prompts.length; i += CONCURRENCY_LIMIT) {
    const chunk = prompts.slice(i, i + CONCURRENCY_LIMIT);
    const chunkResults = await Promise.all(
      chunk.map((p) => generateJSON<T>(p, options))
    );
    results.push(...chunkResults);
  }
  return results;
}
