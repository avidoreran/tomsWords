import fs from "node:fs";
import path from "node:path";

const generatedDir = path.resolve("tmp/generated-batches");
const outputPath = path.resolve("src/content/generatedWords.ts");

if (!fs.existsSync(generatedDir)) {
  console.error("Missing generated batch directory");
  process.exit(1);
}

const batchFiles = fs
  .readdirSync(generatedDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const allEntries = [];
for (const file of batchFiles) {
  const entries = JSON.parse(fs.readFileSync(path.join(generatedDir, file), "utf8"));
  allEntries.push(...entries);
}

const content = `import type { WordEntry } from "../types";\n\nexport const GENERATED_WORDS: WordEntry[] = ${JSON.stringify(
  allEntries,
  null,
  2,
)} as WordEntry[];\n`;

fs.writeFileSync(outputPath, content);
console.log(`Merged ${allEntries.length} generated entries into ${outputPath}`);
