import fs from "node:fs";
import path from "node:path";

const sourcePath =
  process.argv[2] ?? "/Users/eranavidor/Downloads/מילים לתום - Sheet1.csv";

const outputs = {
  json: path.resolve("tmp/generated-batches/sheet-generated.json"),
  csv: path.resolve("tmp/generated-batches/sheet-generated.csv"),
  ts: path.resolve("src/content/sheetWords.ts"),
  report: path.resolve("tmp/generated-batches/problematic-correct-answers.md"),
};

fs.mkdirSync(path.dirname(outputs.json), { recursive: true });

const STOPWORDS = new Set([
  "של",
  "את",
  "על",
  "עם",
  "או",
  "גם",
  "מי",
  "מה",
  "זה",
  "זו",
  "זאת",
  "הוא",
  "היא",
  "הם",
  "הן",
  "יש",
  "אין",
  "לא",
  "כן",
  "כל",
  "אשר",
  "אם",
  "מן",
  "אל",
  "עד",
  "ליד",
  "בין",
  "אחרי",
  "לפני",
  "תוך",
  "כמו",
  "בעל",
  "בעלי",
  "מקום",
  "זמן",
  "דבר",
  "חלק",
  "סוג",
]);

const translitMap = {
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

const DISTRACTOR_POOLS = {
  noun: [
    "פעמון",
    "ספסל",
    "חלון",
    "מדף",
    "שביל",
    "צעיף",
    "פנס",
    "קערה",
    "דגל",
    "שרפרף",
    "תרמיל",
    "מזלג",
  ],
  adjective: [
    "מהיר",
    "שקט",
    "זהיר",
    "אמיץ",
    "עשיר",
    "קשוח",
    "חכם",
    "שמח",
    "חלש",
    "בהיר",
    "ישר",
    "נמוך",
  ],
  verb: [
    "לרוץ",
    "לשבת",
    "לצחוק",
    "לכתוב",
    "להקשיב",
    "לספור",
    "לשמוח",
    "להתחבא",
    "לנסוע",
    "להרים",
    "לסדר",
    "לשמור",
  ],
  place: [
    "מקום למנוחה",
    "אזור למגורים",
    "מקום ללימודים",
    "שטח פתוח למשחק",
    "מקום לאחסון חפצים",
    "אזור ליד הים",
    "מקום למפגש אנשים",
    "מקום לעבודה",
  ],
  object: [
    "כלי לכתיבה",
    "רהיט לישיבה",
    "כיסוי לראש",
    "חפץ לתלייה",
    "כלי להגשה",
    "אביזר לנשיאה",
    "כלי לאחסון",
    "מכשיר למדידה",
  ],
  time: [
    "זמן קצר מאוד",
    "שעה קבועה ביום",
    "תקופה ארוכה",
    "הזמן שאחרי הצהריים",
    "זמן למנוחה",
    "תחילת היום",
    "סוף השבוע",
    "פרק זמן קצר",
  ],
  emotion: [
    "תחושת שמחה",
    "תחושת פחד",
    "תחושת עצב",
    "תחושת הקלה",
    "תחושת כעס",
    "תחושת גאווה",
    "תחושת מבוכה",
    "תחושת סקרנות",
  ],
  personDef: [
    "אדם שאוהב לעזור",
    "אדם שמרבה לדבר",
    "אדם שעובד בשדה",
    "אדם ששומר על הסדר",
    "אדם שממהר מאוד",
    "אדם שאוהב ללמוד",
    "אדם שנוטה לפחד",
    "אדם שממציא סיפורים",
  ],
  synonymList: [
    "אור, זוהר",
    "כעס, זעם",
    "שמחה, חדווה",
    "שקט, דממה",
    "מהירות, זריזות",
    "פחד, אימה",
    "עייפות, תשישות",
    "חוכמה, תבונה",
    "יופי, הדר",
    "בלבול, מבוכה",
  ],
  longDef: [
    "מצב של קושי ממושך",
    "דבר שנעשה בסתר",
    "פעולה שמטרתה לעזור",
    "מקום המשמש לאחסון",
    "אדם הנוטה להיזהר",
    "מצב של חוסר שקט",
    "כינוי לדבר חשוב",
    "דרך פעולה מסודרת",
  ],
};

const parseCsv = (raw) => {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length > 0) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
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

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      pushField();
      pushRow();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
};

const normalize = (value) =>
  value
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*;\s*/g, "; ")
    .trim();

const tokenize = (value) =>
  normalize(value)
    .replace(/[()״"'!?]/g, " ")
    .split(/[ ,;:.־\-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

const classify = (answer) => {
  const text = normalize(answer);
  if (text.includes(";")) return "multi-sense";
  if (text.includes(",")) return "synonym-list";
  if (/^(ל|לה|להת|להיות)/.test(text)) return "verb";
  if (/^(מי ש|אדם ש|מי ש)/.test(text)) return "person-def";
  if (/(מקום|אזור|שטח|בית|מפעל)/.test(text)) return "place";
  if (/(כלי|מכשיר|אביזר|חפץ|כיסוי|בד)/.test(text)) return "object";
  if (/(זמן|תקופה|רגע|שעה|יום|חודש|שנה)/.test(text)) return "time";
  if (/(רגש|תחושה|שמחה|עצב|פחד|כעס)/.test(text)) return "emotion";
  if (text.split(" ").length >= 5) return "long-def";
  return "short";
};

const classifyShortWord = (answer) => {
  const text = normalize(answer);
  if (text.includes(" ")) return "longDef";
  if (text.startsWith("ל")) return "verb";
  if (/[ייםותה]$/.test(text)) return "noun";
  if (/[יןירךףץ]$/.test(text) && text.length <= 5) return "adjective";
  return "noun";
};

const splitCorrectAnswers = (answer) => {
  const normalized = normalize(answer);
  const canBeStandaloneAlternative = (part) => {
    const tokens = part.split(" ").filter(Boolean);
    if (tokens.length > 2) return false;
    return !/^(ש|שבו|שלא|שיש|כש|כאשר|ההפך|נאמר|כגון)/.test(part);
  };

  if (normalized.includes(";")) {
    return normalized
      .split(";")
      .map((part) => normalize(part))
      .filter(Boolean);
  }

  if (normalized.includes("/")) {
    const slashParts = normalized
      .split("/")
      .map((part) => normalize(part))
      .filter(Boolean);
    if (slashParts.length > 1 && slashParts.every(canBeStandaloneAlternative)) {
      return slashParts;
    }
  }

  const commaParts = normalized
    .split(",")
    .map((part) => normalize(part))
    .filter(Boolean);

  if (commaParts.length > 1 && commaParts.every(canBeStandaloneAlternative)) {
    return commaParts;
  }

  return [normalized];
};

const slugify = (word, index) => {
  const slug = [...word]
    .map((char) => translitMap[char] ?? (/[a-zA-Z0-9]/.test(char) ? char.toLowerCase() : "-"))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "word"}-${String(index + 1).padStart(3, "0")}`;
};

const csvRaw = fs.readFileSync(sourcePath, "utf8");
const parsed = parseCsv(csvRaw).filter((row) => row.length >= 2);
const [, ...dataRows] = parsed;

const rows = dataRows.map(([word, correctAnswer], index) => {
  const normalizedWord = normalize(word);
  const correctAnswers = splitCorrectAnswers(correctAnswer);
  const primaryCorrectAnswer = correctAnswers[0];
  return {
    id: slugify(normalizedWord, index),
    word: normalizedWord,
    correctAnswers,
    primaryCorrectAnswer,
    tokens: tokenize(primaryCorrectAnswer),
    classification: classify(primaryCorrectAnswer),
    sourceAnswer: normalize(correctAnswer),
  };
});

const hash = (value) =>
  [...value].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);

const pickFromPool = (poolName, row) => {
  const pool = DISTRACTOR_POOLS[poolName] ?? DISTRACTOR_POOLS.longDef;
  const rowTokens = new Set(row.tokens);
  const candidates = pool.filter((candidate) => {
    if (row.correctAnswers.includes(candidate)) return false;
    const candidateTokens = tokenize(candidate);
    const overlap = candidateTokens.filter((token) => rowTokens.has(token));
    return overlap.length === 0;
  });

  const base = hash(row.word + row.primaryCorrectAnswer);
  const selected = [];
  for (let offset = 0; offset < candidates.length && selected.length < 3; offset += 1) {
    const candidate = candidates[(base + offset) % candidates.length];
    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  return selected;
};

const candidateScore = (row, candidate) => {
  let score = 0;
  if (row.classification === candidate.classification) score += 20;
  const lengthDiff = Math.abs(
    row.primaryCorrectAnswer.length - candidate.primaryCorrectAnswer.length,
  );
  score += Math.max(0, 15 - lengthDiff / 3);
  const rowSet = new Set(row.tokens);
  const overlap = candidate.tokens.filter((token) => rowSet.has(token)).length;
  score -= overlap * 12;
  if (candidate.sourceAnswer.includes(";")) score -= 8;
  if (candidate.sourceAnswer.includes("/")) score -= 4;
  if (candidate.primaryCorrectAnswer.split(" ").length > 10) score -= 6;
  return score;
};

const pickDistractors = (row) => {
  if (row.classification === "multi-sense" || row.classification === "synonym-list") {
    return pickFromPool("synonymList", row);
  }
  if (row.classification === "verb") {
    return pickFromPool("verb", row);
  }
  if (row.classification === "person-def") {
    return pickFromPool("personDef", row);
  }
  if (row.classification === "place") {
    return pickFromPool("place", row);
  }
  if (row.classification === "object") {
    return pickFromPool("object", row);
  }
  if (row.classification === "time") {
    return pickFromPool("time", row);
  }
  if (row.classification === "emotion") {
    return pickFromPool("emotion", row);
  }
  if (row.classification === "long-def") {
    return pickFromPool("longDef", row);
  }
  if (row.classification === "short") {
    return pickFromPool(classifyShortWord(row.primaryCorrectAnswer), row);
  }

  const candidates = rows
    .filter(
      (candidate) =>
        candidate.word !== row.word &&
        !candidate.correctAnswers.some((answer) => row.correctAnswers.includes(answer)),
    )
    .filter((candidate) => {
      const overlap = candidate.tokens.filter((token) => row.tokens.includes(token));
      return overlap.length <= 1;
    })
    .sort((left, right) => candidateScore(row, right) - candidateScore(row, left));

  const selected = [];
  for (const candidate of candidates) {
    if (selected.length === 3) break;
    if (selected.includes(candidate.primaryCorrectAnswer)) continue;
    selected.push(candidate.primaryCorrectAnswer);
  }

  if (selected.length < 3) {
    for (const candidate of rows) {
      if (candidate.word === row.word) continue;
      if (candidate.correctAnswers.some((answer) => row.correctAnswers.includes(answer))) continue;
      if (selected.includes(candidate.primaryCorrectAnswer)) continue;
      selected.push(candidate.primaryCorrectAnswer);
      if (selected.length === 3) break;
    }
  }

  return selected;
};

const generated = rows.map((row) => ({
  id: row.id,
  word: row.word,
  correctAnswers: row.correctAnswers,
  wrongAnswers: pickDistractors(row),
}));

const problematic = rows.filter((row) => {
  const text = row.sourceAnswer;
  return (
    row.correctAnswers.length > 1 ||
    text.split(" ").length > 10 ||
    /\/|\(|\)/.test(text) ||
    /,/.test(text) ||
    text.length > 55
  );
});

const report = [
  "# Problematic Correct Answers",
  "",
  "These rows are structurally valid, but their correct meanings are likely weak for a child-friendly multiple-choice game.",
  "Reasons include: multiple senses in one answer, long explanatory text, synonym piles, or formatting that suggests the source should be simplified.",
  "",
  `Total flagged rows: ${problematic.length}`,
  "",
  ...problematic.map(
    (row) => `- ${row.word}: ${row.sourceAnswer} [${row.classification}]`,
  ),
  "",
].join("\n");

fs.writeFileSync(outputs.report, report);
fs.writeFileSync(outputs.json, `${JSON.stringify(generated, null, 2)}\n`);

const csvHeader = "מילה,פירושים,תשובה שגויה 1,תשובה שגויה 2,תשובה שגויה 3\n";
const escapeCsv = (value) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
const csvRows = generated
  .map((row) =>
    [row.word, row.correctAnswers.join(" | "), ...row.wrongAnswers].map(escapeCsv).join(","),
  )
  .join("\n");
fs.writeFileSync(outputs.csv, `${csvHeader}${csvRows}\n`);

const tsFile = `import type { WordEntry } from "../types";\n\nexport const SHEET_WORDS: WordEntry[] = ${JSON.stringify(
  generated,
  null,
  2,
)};\n`;
fs.writeFileSync(outputs.ts, tsFile);

console.log(`Generated ${generated.length} sheet entries.`);
console.log(`Flagged ${problematic.length} problematic correct answers.`);
