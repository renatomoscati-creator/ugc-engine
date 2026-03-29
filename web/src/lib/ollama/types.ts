export interface IdeaOutput {
  topic: string;
  angle: string;
  hookSketch: string;
  pillarName: string;
}

export interface ScriptOutput {
  hook: string;
  openingLine: string;
  bodyBeats: string[];
  proofDemoBeat: string;
  ctaClosingBeat: string;
  estimatedDuration: number;
  visualPlan: {
    talkingHeadPercent: number;
    overlayTypes: string[];
    brollSuggestions: string[];
  };
  captionIdeas: string[];
  hashtags: string[];
  hookType: string;
  format: string;
  ctaType: string;
}
