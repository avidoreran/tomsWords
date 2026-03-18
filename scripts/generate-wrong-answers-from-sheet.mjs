import fs from "node:fs";
import path from "node:path";

const sourcePath = process.argv[2];

if (!sourcePath) {
  console.error("Usage: node scripts/generate-wrong-answers-from-sheet.mjs <csv-path>");
  process.exit(1);
}

const transliterationMap = {
  א: "a",
  ב: "b",
  ג: "g",
  ד: "d",
  ה: "h",
  ו: "v",
  ז: "z",
  ח: "ch",
  ט: "t",
  י: "y",
  כ: "k",
  ך: "k",
  ל: "l",
  מ: "m",
  ם: "m",
  נ: "n",
  ן: "n",
  ס: "s",
  ע: "a",
  פ: "p",
  ף: "p",
  צ: "tz",
  ץ: "tz",
  ק: "k",
  ר: "r",
  ש: "sh",
  ת: "t",
};

const slugifyHebrew = (word, index) => {
  const slug = [...word]
    .map((char) => transliterationMap[char] ?? "")
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `${slug}-${String(index + 1).padStart(3, "0")}` : `word-${String(index + 1).padStart(3, "0")}`;
};

const parseCsv = (raw) => {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  const pushValue = () => {
    row.push(value);
    value = "";
  };

  const pushRow = () => {
    if (row.some((field) => field.length > 0)) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      pushValue();
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      pushValue();
      pushRow();
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    pushValue();
    pushRow();
  }

  return rows;
};

const escapeCsv = (value) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const raw = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
const [header, ...dataRows] = parseCsv(raw);

if (!header || dataRows.length === 0) {
  console.error("CSV is empty or malformed");
  process.exit(1);
}

const entries = dataRows.map((fields) => ({
  word: (fields[0] ?? "").trim(),
  correctAnswer: (fields[1] ?? "").trim(),
}));

const shortAnswers = entries.filter((entry) => entry.correctAnswer.length <= 18);
const mediumAnswers = entries.filter(
  (entry) => entry.correctAnswer.length > 18 && entry.correctAnswer.length <= 45,
);
const longAnswers = entries.filter((entry) => entry.correctAnswer.length > 45);

const pickPool = (answer) => {
  if (answer.length <= 18) {
    return shortAnswers;
  }
  if (answer.length <= 45) {
    return mediumAnswers;
  }
  return longAnswers.length >= 4 ? longAnswers : mediumAnswers;
};

const generated = entries.map((entry, index) => {
  const pool = pickPool(entry.correctAnswer);
  const wrongAnswers = [];
  let offset = 1;

  while (wrongAnswers.length < 3) {
    const candidate = pool[(index + offset * 37) % pool.length]?.correctAnswer;
    offset += 1;

    if (!candidate || candidate === entry.correctAnswer || wrongAnswers.includes(candidate)) {
      continue;
    }

    wrongAnswers.push(candidate);
  }

  return {
    id: slugifyHebrew(entry.word, index),
    word: entry.word,
    correctAnswer: entry.correctAnswer,
    wrongAnswers,
  };
});

const generatedDir = path.resolve("tmp/generated-batches");
fs.mkdirSync(generatedDir, { recursive: true });

const jsonPath = path.join(generatedDir, "sheet-generated.json");
const csvPath = path.join(generatedDir, "sheet-generated.csv");
const tsPath = path.resolve("src/content/sheetWords.ts");

fs.writeFileSync(jsonPath, `${JSON.stringify(generated, null, 2)}\n`);

const csvLines = [
  ["מילה", "פירוש", "תשובה שגויה 1", "תשובה שגויה 2", "תשובה שגויה 3"].join(","),
  ...generated.map((entry) =>
    [
      entry.word,
      entry.correctAnswer,
      entry.wrongAnswers[0],
      entry.wrongAnswers[1],
      entry.wrongAnswers[2],
    ]
      .map(escapeCsv)
      .join(","),
  ),
];
fs.writeFileSync(csvPath, `${csvLines.join("\n")}\n`);

const tsContent = `import type { WordEntry } from "../types";\n\nexport const SHEET_WORDS: WordEntry[] = ${JSON.stringify(
  generated,
  null,
  2,
)} as WordEntry[];\n`;
fs.writeFileSync(tsPath, tsContent);

console.log(`Generated ${generated.length} entries`);
console.log(jsonPath);
console.log(csvPath);
console.log(tsPath);
