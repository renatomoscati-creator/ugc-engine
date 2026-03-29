export function ideaGenerationPrompt(params: {
  personaName: string;
  niche: string;
  voiceTone: string;
  pillarName: string;
  pillarDescription: string;
  bannedClaims: string[];
  count: number;
  existingApproved?: Array<{ topic: string; angle: string; hookSketch: string }>;
  userGuidance?: string;
}): string {
  const styleRef =
    params.existingApproved && params.existingApproved.length > 0
      ? `\nStyle reference — these are ideas already approved for this creator. Match their energy, specificity, and format:\n${params.existingApproved.map((e) => `- [${e.topic}] ${e.angle} | Hook: ${e.hookSketch}`).join("\n")}\n\nGenerate NEW ideas in the same style. Do not repeat these topics.\n`
      : "";

  const guidanceNote = params.userGuidance?.trim()
    ? `\nAdditional direction from the creator: "${params.userGuidance.trim()}"\n`
    : "";

  return `You are a content strategist for a virtual creator named "${params.personaName}" in the ${params.niche} niche.

Voice and tone: ${params.voiceTone}
Content pillar: ${params.pillarName} — ${params.pillarDescription}
Banned claims or restricted topics: ${params.bannedClaims.join(", ") || "none"}
${styleRef}${guidanceNote}
Generate exactly ${params.count} short-form video content ideas for TikTok/Instagram Reels/YouTube Shorts.
Each idea should be highly specific, scroll-stopping, and optimized for the 15-30 second format.

Respond with ONLY a JSON array:
\`\`\`json
[
  {
    "topic": "specific topic of the video",
    "angle": "unique angle or perspective that makes this interesting",
    "hookSketch": "opening 3-5 words that would stop someone scrolling",
    "pillarName": "${params.pillarName}"
  }
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
