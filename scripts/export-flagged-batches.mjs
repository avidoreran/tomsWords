import fs from "node:fs";
import path from "node:path";
import { SHEET_WORDS } from "../src/content/sheetWords.ts";

const outputDir = path.resolve("tmp/curation-batches");
const batchSize = Number(process.argv[2] ?? 45);

fs.mkdirSync(outputDir, { recursive: true });

const flagged = SHEET_WORDS.filter(
  (row) =>
    row.correctAnswers.length > 1 ||
    row.correctAnswers[0].length > 55 ||
    /[;/]/.test(row.correctAnswers.join(" | ")) ||
    row.correctAnswers[0].split(" ").length > 10 ||
    /,/.test(row.correctAnswers.join(" | ")),
);

flagged.forEach((entry, index) => {
  const batchNumber = Math.floor(index / batchSize) + 1;
  const batchPath = path.join(
    outputDir,
    `batch-${String(batchNumber).padStart(2, "0")}.json`,
  );
  const current = fs.existsSync(batchPath)
    ? JSON.parse(fs.readFileSync(batchPath, "utf8"))
    : [];
  current.push({
    word: entry.word,
    currentCorrectAnswers: entry.correctAnswers,
  });
  fs.writeFileSync(batchPath, `${JSON.stringify(current, null, 2)}\n`);
});

console.log(
  `Exported ${flagged.length} flagged rows into ${Math.ceil(flagged.length / batchSize)} batches.`,
);
