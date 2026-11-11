/**
 * Deterministic safety checks that run BEFORE the LLM.
 * Rule of thumb: anything that could hurt a patient or must never be missed
 * (emergencies, "I want a human") is handled by code, not by the model.
 */
export type GuardDecision =
  | { type: 'EMERGENCY'; matched: string }
  | { type: 'HUMAN'; matched: string }
  | { type: 'NONE' };

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(swelling|swollen|swelled)\b/i,
  /\b(heavy|won'?t stop|nonstop|lots of)\s+bleed/i,
  /\bbleeding\b.*\b(stop|lot|heavy)\b/i,
  /\b(can'?t|cannot|hard to|difficulty)\s+(breathe|breathing|swallow|swallowing|open my mouth)\b/i,
  /\bknocked\s+out\b/i,
  /\b(broken|cracked|fractured)\s+(tooth|teeth|jaw)\b/i,
  /\b(severe|unbearable|extreme|excruciating|really bad|terrible)\s+(tooth\s*)?(pain|ache|toothache)\b/i,
  /\babscess\b/i,
  // "I'm in pain" is also a widget quick reply: always route it to the safe urgent reply, never to the model.
  /\b(i'?m|i am)\s+in\s+(a lot of\s+|so much\s+)?pain\b/i,
  /\b(accident|injury|injured|trauma|hit in the (mouth|face))\b/i,
  /\bfever\b/i,
  // NOTE: plain words like "emergency" are NOT here on purpose, so "How much is an
  // emergency appointment?" still gets a normal price answer from the agent.
  /\b(this is|it'?s|i have) an emergency\b/i,
];

const HUMAN_PATTERNS: RegExp[] = [
  /\b(real|actual)\s+(person|human)\b/i,
  /\b(speak|talk|chat)\s+(to|with)\s+(a\s+|the\s+)?(human|person|someone|staff|receptionist|team|dentist|manager)\b/i,
  /\b(want|need)\s+(a\s+|to\s+speak\s+to\s+a\s+)?(human|real person)\b/i,
  /\b(call|ring|phone)\s+me\b/i,
  /\bcomplain(t)?\b/i,
];

export function checkGuardrails(message: string): GuardDecision {
  const text = message.slice(0, 1000);
  for (const p of EMERGENCY_PATTERNS) {
    const m = p.exec(text);
    if (m) return { type: 'EMERGENCY', matched: m[0] };
  }
  for (const p of HUMAN_PATTERNS) {
    const m = p.exec(text);
    if (m) return { type: 'HUMAN', matched: m[0] };
  }
  return { type: 'NONE' };
}
