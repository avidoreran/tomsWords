import fs from "node:fs";
import { SHEET_WORDS } from "../src/content/sheetWords.ts";

const reportPath = "tmp/generated-batches/problematic-correct-answers.md";

const classify = (entry) => {
  const joined = entry.correctAnswers.join(" | ");
  if (joined.length > 55) return "long-def";
  if (joined.split(" ").length > 8) return "long-def";
  if (/,|;|\//.test(joined)) return "complex-format";
  return null;
};

const problematic = SHEET_WORDS.filter((entry) => classify(entry));

const report = [
  "# Problematic Correct Answers",
  "",
  "These rows still deserve human review after normalization.",
  "They usually have multiple true senses, long definitions, or answer text that is still too dense for a child-facing multiple-choice game.",
  "",
  `Total flagged rows: ${problematic.length}`,
  "",
  ...problematic.map((entry) => {
    const reason = classify(entry);
    return `- ${entry.word}: ${entry.correctAnswers.join(" | ")} [${reason}]`;
  }),
  "",
].join("\n");

fs.writeFileSync(reportPath, report);
console.log(`Reported ${problematic.length} current issues.`);
