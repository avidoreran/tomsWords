import fs from "node:fs";
import path from "node:path";

const generatedDir = path.resolve("tmp/generated-batches");

if (!fs.existsSync(generatedDir)) {
  console.error("Missing generated batch directory");
  process.exit(1);
}

const files = fs
  .readdirSync(generatedDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const issues = [];
const ids = new Set();
const words = new Set();
let total = 0;

for (const file of files) {
  const batch = JSON.parse(fs.readFileSync(path.join(generatedDir, file), "utf8"));
  if (!Array.isArray(batch)) {
    issues.push(`${file}: batch is not an array`);
    continue;
  }

  for (const [index, entry] of batch.entries()) {
    total += 1;
    const label = `${file}[${index}]`;

    if (!entry || typeof entry !== "object") {
      issues.push(`${label}: entry is not an object`);
      continue;
    }

    if (typeof entry.id !== "string" || entry.id.length === 0) {
      issues.push(`${label}: missing id`);
    } else if (ids.has(entry.id)) {
      issues.push(`${label}: duplicate id ${entry.id}`);
    } else {
      ids.add(entry.id);
    }

    if (typeof entry.word !== "string" || entry.word.length === 0) {
      issues.push(`${label}: missing word`);
    } else if (words.has(entry.word)) {
      issues.push(`${label}: duplicate word ${entry.word}`);
    } else {
      words.add(entry.word);
    }

    if (!Array.isArray(entry.correctAnswers) || entry.correctAnswers.length === 0) {
      issues.push(`${label}: missing correctAnswers`);
    }

    if (!Array.isArray(entry.wrongAnswers) || entry.wrongAnswers.length !== 3) {
      issues.push(`${label}: wrongAnswers must have exactly 3 items`);
      continue;
    }

    const distinctWrong = new Set(entry.wrongAnswers);
    if (distinctWrong.size !== 3) {
      issues.push(`${label}: wrongAnswers contain duplicates`);
    }

    if (entry.correctAnswers?.some((answer) => entry.wrongAnswers.includes(answer))) {
      issues.push(`${label}: wrongAnswers include one of correctAnswers`);
    }
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log(`Validated ${total} generated entries across ${files.length} batch files.`);
