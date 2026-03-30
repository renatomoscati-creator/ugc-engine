export function ideaGenerationPrompt(params: {
  personaName: string;
  niche: string;
  voiceTone: string;
  pillarName: string;
  pillarDescription: string;
  bannedClaims: string[];
  count: number;
  existingApproved?: Array<{ topic: string; angle: string; hookSketch: string }>;
  rejectedIdeas?: Array<{ topic: string; angle: string; hookSketch: string }>;
  existingTopics?: string[];
  userGuidance?: string;
  entropySeed?: string;
}): string {
  const styleRef =
    params.existingApproved && params.existingApproved.length > 0
      ? `\nSTYLE REFERENCE — ideas already approved. Match this energy exactly:\n${params.existingApproved.map((e) => `  • [${e.topic}] ${e.angle} | Hook: "${e.hookSketch}"`).join("\n")}\n`
      : "";

  const rejectedBlock =
    params.rejectedIdeas && params.rejectedIdeas.length > 0
      ? `\nREJECTED — do NOT produce anything in this direction, flavor, or format:\n${params.rejectedIdeas.map((e) => `  ✗ [${e.topic}] ${e.angle} | Hook: "${e.hookSketch}"`).join("\n")}\nAvoid the angle, framing, and tone of every item above — not just the literal topic.\n`
      : "";

  const avoidTopics =
    params.existingTopics && params.existingTopics.length > 0
      ? `\nALREADY COVERED — do not repeat or closely paraphrase:\n${params.existingTopics.slice(0, 40).map((t) => `  - ${t}`).join("\n")}\n`
      : "";

  const guidanceNote = params.userGuidance?.trim()
    ? `\nCREATOR DIRECTION: "${params.userGuidance.trim()}"\n`
    : "";

  // Rotate through different creative angles each run to break pattern lock
  const angles = [
    "contrarian take — argue the opposite of conventional wisdom",
    "extreme specificity — niche down to a micro-audience or ultra-specific scenario",
    "story-driven — hook based on a surprising personal or case-study narrative",
    "myth-busting — expose a common misconception in this space",
    "challenge format — dare the viewer to do or test something",
    "behind-the-scenes — reveal something most people never see",
    "comparison — side-by-side of two opposing approaches",
    "mistake-first — open with a relatable failure, then flip it",
  ];
  const angleHint = angles[Math.floor(Math.random() * angles.length)];

  return `You are a creative director for short-form video. Your job is to generate fresh, scroll-stopping content ideas.

CREATOR: "${params.personaName}" | NICHE: ${params.niche}
VOICE: ${params.voiceTone}
PILLAR: ${params.pillarName} — ${params.pillarDescription}
BANNED TOPICS: ${params.bannedClaims.join(", ") || "none"}
${styleRef}${rejectedBlock}${avoidTopics}${guidanceNote}
CREATIVE ANGLE FOR THIS BATCH: ${angleHint}

Rules:
1. Every idea must feel DIFFERENT from the others in this batch — vary hook type, format, and tone
2. Be hyper-specific. "5 mistakes beginners make" is lazy. Specific version: "The $12 tool pros use that beginners overlook"
3. Never produce generic motivational or obvious educational content
4. Each hookSketch must be the literal opening words someone would hear/read — make them visceral and urgent

Generate exactly ${params.count} ideas optimized for 15-30s vertical video.

Respond with ONLY a JSON array:
\`\`\`json
[
  {
    "topic": "specific topic of the video",
    "angle": "unique angle or perspective",
    "hookSketch": "exact opening words (under 8 words, punchy)",
    "pillarName": "${params.pillarName}"
  }
]
\`\`\``;
}

export function ideaFitScoringPrompt(params: {
  persona: { name: string; niche: string; voiceTone: string; targetAudience: string };
  ideas: Array<{ topic: string; angle: string; hookSketch: string }>;
  approvedExamples: Array<{ topic: string; angle: string; hookSketch: string }>;
  rejectedExamples: Array<{ topic: string; angle: string; hookSketch: string }>;
}): string {
  const approvedBlock =
    params.approvedExamples.length > 0
      ? `\nGOOD FIT examples (approved by creator — match this energy):\n${params.approvedExamples.slice(0, 6).map((e) => `  ✓ [${e.topic}] ${e.angle} | Hook: "${e.hookSketch}"`).join("\n")}\n`
      : "";

  const rejectedBlock =
    params.rejectedExamples.length > 0
      ? `\nBAD FIT examples (rejected by creator — avoid these patterns):\n${params.rejectedExamples.slice(0, 6).map((e) => `  ✗ [${e.topic}] ${e.angle} | Hook: "${e.hookSketch}"`).join("\n")}\n`
      : "";

  const ideasList = params.ideas
    .map((idea, i) => `${i + 1}. topic="${idea.topic}" | angle="${idea.angle}" | hook="${idea.hookSketch}"`)
    .join("\n");

  return `You are scoring content ideas for persona fit.

CREATOR: "${params.persona.name}"
NICHE: ${params.persona.niche}
VOICE/TONE: ${params.persona.voiceTone}
TARGET AUDIENCE: ${params.persona.targetAudience}
${approvedBlock}${rejectedBlock}
Score each idea 0-100 for persona fit using these criteria:
- Relevance to niche (does it belong in this creator's space?)
- Match to voice/tone (would this creator naturally say this?)
- Audience appeal (would their specific audience care about this?)
- Originality (fresh angle vs. already-covered territory)

IDEAS TO SCORE:
${ideasList}

Respond with ONLY a JSON array (one entry per idea, same order):
\`\`\`json
[
  { "topic": "exact topic string", "score": 85, "reason": "one sentence explaining the score" }
]
\`\`\``;
}

export function nicheResearchPrompt(niche: string, platform: string): string {
  return `You are a social media strategist specializing in short-form content. Analyze the "${niche}" niche on ${platform}.

Provide a comprehensive breakdown covering:
1. Top content formats that perform best
2. Hook patterns that drive high watch time
3. Optimal video length in seconds
4. Ideal posting frequency per week
5. Audience demographics (age range, interests, income level)
6. Monetization potential (rate sponsorship attractiveness 1-10, list revenue streams)
7. Your overall confidence in this analysis (0.0 to 1.0)

Respond with ONLY valid JSON:
\`\`\`json
{
  "formats": ["format1", "format2", "format3"],
  "hooks": ["hook pattern 1", "hook pattern 2", "hook pattern 3"],
  "optimalLength": 30,
  "postingFrequency": 5,
  "audienceProfile": {
    "ageRange": "18-34",
    "interests": ["interest1", "interest2"],
    "incomeLevel": "middle"
  },
  "monetizationPotential": {
    "sponsorshipScore": 7,
    "revenueStreams": ["brand deals", "affiliate", "digital products"]
  },
  "confidence": 0.85
}
\`\`\``;
}

export function scriptGenerationPrompt(params: {
  personaName: string;
  niche: string;
  voiceTone: string;
  topic: string;
  angle: string;
  hookSketch: string;
  platform: string;
  bannedClaims: string[];
}): string {
  return `You are writing a short-form video script for a virtual creator named "${params.personaName}" in the ${params.niche} niche.

Platform: ${params.platform}
Voice and tone: ${params.voiceTone}
Topic: ${params.topic}
Angle: ${params.angle}
Suggested hook: ${params.hookSketch}
Banned claims: ${params.bannedClaims.join(", ") || "none"}

Write a complete 15-30 second script. The video structure is:
- 0-2s: Hook (character visible, hook text overlay)
- 2-6s: Talking-head beat (main claim or promise)
- 6-14s: Overlays/screenshots/list cards (supporting content)
- 14-20s: Return to face for payoff and CTA

Respond with ONLY a JSON object:
\`\`\`json
{
  "hook": "exact hook line (under 8 words)",
  "openingLine": "first spoken sentence (talking head beat)",
  "bodyBeats": ["beat 1", "beat 2", "beat 3"],
  "proofDemoBeat": "supporting fact, stat, or demonstration",
  "ctaClosingBeat": "closing call to action",
  "estimatedDuration": 22,
  "visualPlan": {
    "talkingHeadPercent": 30,
    "overlayTypes": ["text_card", "screenshot", "list"],
    "brollSuggestions": ["specific b-roll idea 1", "specific b-roll idea 2"]
  },
  "captionIdeas": ["caption option 1", "caption option 2"],
  "hashtags": ["#tag1", "#tag2"],
  "hookType": "question|mistake|secret|number_list|transformation",
  "format": "talking_head|faceless|hybrid",
  "ctaType": "follow|comment|share|link_in_bio"
}
\`\`\``;
}
