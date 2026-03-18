import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("tmp/curated-overrides");
const files = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((file) => file.endsWith(".json")).sort()
  : [];

const issues = [];
let total = 0;

for (const file of files) {
  const rows = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  if (!Array.isArray(rows)) {
    issues.push(`${file}: not an array`);
    continue;
  }

  for (const [index, row] of rows.entries()) {
    total += 1;
    const label = `${file}[${index}]`;
    if (typeof row.word !== "string" || !row.word.trim()) {
      issues.push(`${label}: missing word`);
    }
    if (!Array.isArray(row.correctAnswers) || row.correctAnswers.length === 0) {
      issues.push(`${label}: missing correctAnswers`);
      continue;
    }
    const distinct = new Set(row.correctAnswers.map((item) => item.trim()));
    if (distinct.size !== row.correctAnswers.length) {
      issues.push(`${label}: duplicate correctAnswers`);
    }
    if ([...distinct].some((item) => item.length === 0)) {
      issues.push(`${label}: empty correct answer`);
    }
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log(`Validated ${total} curated override rows across ${files.length} files.`);
