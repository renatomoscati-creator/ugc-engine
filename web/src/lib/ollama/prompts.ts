export function ideaGenerationPrompt(params: {
  personaName: string;
  niche: string;
  voiceTone: string;
  pillarName: string;
  pillarDescription: string;
  bannedClaims: string[];
  count: number;
}): string {
  return `You are a content strategist for a virtual creator named "${params.personaName}" in the ${params.niche} niche.

Voice and tone: ${params.voiceTone}
Content pillar: ${params.pillarName} — ${params.pillarDescription}
Banned claims or restricted topics: ${params.bannedClaims.join(", ") || "none"}

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
