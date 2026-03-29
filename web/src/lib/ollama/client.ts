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
      think: false, // disable Qwen3 thinking mode — prevents <think>...</think> noise
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

  // Strip any residual thinking blocks just in case
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // 1. Fenced ```json block
  const fencedJson = stripped.match(/```json\s*([\s\S]*?)\s*```/);
  if (fencedJson) return JSON.parse(fencedJson[1]) as T;

  // 2. Any fenced block
  const fencedAny = stripped.match(/```\s*([\s\S]*?)\s*```/);
  if (fencedAny) return JSON.parse(fencedAny[1]) as T;

  // 3. Try parsing the whole stripped string directly
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // fall through to extraction
  }

  // 4. Extract first JSON array (non-greedy won't work for nested, so find balanced brackets)
  const arrStart = stripped.indexOf("[");
  const objStart = stripped.indexOf("{");
  const start = arrStart !== -1 && (objStart === -1 || arrStart < objStart) ? arrStart : objStart;

  if (start === -1) throw new Error(`No JSON found in response: ${stripped.slice(0, 300)}`);

  const opener = stripped[start];
  const closer = opener === "[" ? "]" : "}";
  let depth = 0;
  let end = -1;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === opener) depth++;
    else if (stripped[i] === closer) {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) throw new Error(`Unbalanced JSON in response: ${stripped.slice(0, 300)}`);

  try {
    return JSON.parse(stripped.slice(start, end + 1)) as T;
  } catch (e) {
    throw new Error(`JSON parse failed: ${(e as Error).message}\nRaw: ${stripped.slice(start, end + 1).slice(0, 300)}`);
  }
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
