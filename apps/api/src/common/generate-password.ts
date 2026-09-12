import { randomInt } from "crypto";

// word-word-NN, matching the same shape used for every temporary password issued by hand so far
// in this pilot (docs/11-deployment-railway.md's credential rotation step) — easy to read aloud
// or type once, not meant to be memorized long-term since there is still no self-service reset
// flow yet (docs/15-master-roadmap.md, Phase 0).
const WORDS = [
  "harbor", "summit", "cedar", "falcon", "meadow", "ridge", "glacier", "orchid",
  "lantern", "copper", "willow", "granite", "ember", "thistle", "marble", "cobalt"
];

export function generateTemporaryPassword(): string {
  const first = WORDS[randomInt(WORDS.length)];
  const second = WORDS[randomInt(WORDS.length)];
  const suffix = randomInt(10, 100);
  return `${first}-${second}-${suffix}`;
}
