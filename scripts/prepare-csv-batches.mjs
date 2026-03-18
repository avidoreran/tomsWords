import fs from "node:fs";
import path from "node:path";

const sourcePath = process.argv[2];
const batchSize = Number(process.argv[3] ?? 100);

if (!sourcePath) {
  console.error("Usage: node scripts/prepare-csv-batches.mjs <csv-path> [batch-size]");
  process.exit(1);
}

const outputDir = path.resolve("tmp/word-batches");
fs.mkdirSync(outputDir, { recursive: true });

const raw = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
const lines = raw.split(/\r?\n/).filter(Boolean);
const header = lines.shift();

if (!header) {
  console.error("CSV is empty");
  process.exit(1);
}

const rows = [];
let current = "";
let fields = [];
let inQuotes = false;

const pushField = () => {
  fields.push(current);
  current = "";
};

const pushRow = () => {
  if (fields.length >= 2) {
    rows.push({
      word: fields[0].trim(),
      correctAnswer: fields[1].trim(),
    });
  }
  fields = [];
};

for (const line of lines) {
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      pushField();
      continue;
    }

    current += char;
  }

  pushField();
  pushRow();
}

rows.forEach((row, index) => {
  const batchIndex = Math.floor(index / batchSize) + 1;
  const batchPath = path.join(outputDir, `batch-${String(batchIndex).padStart(2, "0")}.json`);
  const existing = fs.existsSync(batchPath)
    ? JSON.parse(fs.readFileSync(batchPath, "utf8"))
    : [];
  existing.push(row);
  fs.writeFileSync(batchPath, `${JSON.stringify(existing, null, 2)}\n`);
});

console.log(`Prepared ${rows.length} rows into ${Math.ceil(rows.length / batchSize)} batches in ${outputDir}`);
