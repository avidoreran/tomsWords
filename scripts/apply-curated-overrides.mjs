import fs from "node:fs";
import path from "node:path";

const overridesDir = path.resolve("tmp/curated-overrides");
const targetPath = path.resolve("src/content/sheetWords.ts");

const text = fs.readFileSync(targetPath, "utf8");
const match = text.match(
  /export const SHEET_WORDS: WordEntry\[] = (\[[\s\S]*\]);\s*$/,
);

if (!match) {
  console.error("Could not parse sheetWords.ts");
  process.exit(1);
}

const entries = JSON.parse(match[1]);
const overrideFiles = fs.existsSync(overridesDir)
  ? fs.readdirSync(overridesDir).filter((file) => file.endsWith(".json")).sort()
  : [];

const overrides = new Map();
for (const file of overrideFiles) {
  const rows = JSON.parse(fs.readFileSync(path.join(overridesDir, file), "utf8"));
  for (const row of rows) {
    overrides.set(row.word, row.correctAnswers);
  }
}

const updated = entries.map((entry) =>
  overrides.has(entry.word)
    ? {
        ...entry,
        correctAnswers: overrides.get(entry.word),
      }
    : entry,
);

const next = `import type { WordEntry } from "../types";\n\nexport const SHEET_WORDS: WordEntry[] = ${JSON.stringify(updated, null, 2)};\n`;
fs.writeFileSync(targetPath, next);
console.log(`Applied ${overrides.size} curated overrides.`);
