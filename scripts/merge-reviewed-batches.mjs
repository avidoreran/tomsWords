import fs from "node:fs";
import path from "node:path";

const inputDir = path.resolve("tmp/reviewed-batches");
const outputJson = path.resolve("tmp/generated-batches/sheet-generated.json");
const outputTs = path.resolve("src/content/sheetWords.ts");
const outputCsv = path.resolve("tmp/generated-batches/sheet-generated.csv");

const batchFiles = fs
  .readdirSync(inputDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const allEntries = [];
for (const file of batchFiles) {
  const entries = JSON.parse(fs.readFileSync(path.join(inputDir, file), "utf8"));
  allEntries.push(...entries);
}

const csvHeader = "מילה,פירוש,תשובה שגויה 1,תשובה שגויה 2,תשובה שגויה 3\n";
const escapeCsv = (value) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
const csvRows = allEntries
  .map((row) =>
    [row.word, row.correctAnswers.join(" | "), ...row.wrongAnswers].map(escapeCsv).join(","),
  )
  .join("\n");

fs.writeFileSync(outputJson, `${JSON.stringify(allEntries, null, 2)}\n`);
fs.writeFileSync(outputCsv, `${csvHeader}${csvRows}\n`);
fs.writeFileSync(
  outputTs,
  `import type { WordEntry } from "../types";\n\nexport const SHEET_WORDS: WordEntry[] = ${JSON.stringify(allEntries, null, 2)};\n`,
);

console.log(`Merged ${allEntries.length} reviewed entries.`);
