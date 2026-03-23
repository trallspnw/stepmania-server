import fs from "node:fs";
import path from "node:path";

export type ParsedSimfileChart = {
  gameMode: string;
  difficultySlot: string;
  meter: number;
  author: string | null;
};

export type ParsedSimfileResult = {
  tags: Record<string, string>;
  charts: ParsedSimfileChart[];
  simfileType: "ssc" | "sm";
  encoding: string;
  encodingIssue: boolean;
  parseError: string | null;
};

function createEmptyResult(simfileType: "ssc" | "sm"): ParsedSimfileResult {
  return {
    tags: {},
    charts: [],
    simfileType,
    encoding: "",
    encodingIssue: false,
    parseError: null,
  };
}

function decodeBytes(rawBytes: Buffer) {
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
    return { text: decoded, encoding: "utf-8", encodingIssue: false };
  } catch {
    return { text: rawBytes.toString("latin1"), encoding: "latin1", encodingIssue: true };
  }
}

function cleanDecodedText(decodedText: string) {
  const lines: string[] = [];

  for (const rawLine of decodedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    if (rawLine.trimStart().startsWith("//")) {
      continue;
    }

    lines.push(rawLine);
  }

  return lines.join("\n").replace(/^\uFEFF/, "");
}

function parseTagValue(text: string, startIndex: number) {
  let index = startIndex;
  let value = "";

  while (index < text.length) {
    const char = text[index];
    if (char === ";") {
      return { value: value.trim(), nextIndex: index + 1 };
    }
    value += char;
    index += 1;
  }

  throw new Error("unterminated tag value");
}

function skipTagValue(text: string, startIndex: number) {
  let index = startIndex;

  while (index < text.length) {
    if (text[index] === ";") {
      return index + 1;
    }
    index += 1;
  }

  throw new Error("unterminated tag value");
}

function parseSmNotesBlock(text: string, startIndex: number) {
  const fields: string[] = [];
  let current = "";
  let index = startIndex;
  let colonCount = 0;

  while (index < text.length) {
    const char = text[index];

    if (colonCount < 5) {
      if (char === ":") {
        fields.push(current.trim());
        current = "";
        colonCount += 1;
      } else {
        current += char;
      }
    } else if (char === ";") {
      const meter = Number.parseInt(fields[3] ?? "", 10);
      return {
        chart:
          Number.isFinite(meter) && fields[0] && fields[2]
            ? {
                gameMode: fields[0],
                author: fields[1] ? fields[1] : null,
                difficultySlot: fields[2],
                meter,
              }
            : null,
        nextIndex: index + 1,
      };
    }

    index += 1;
  }

  if (colonCount >= 5) {
    const meter = Number.parseInt(fields[3] ?? "", 10);
    return {
      chart:
        Number.isFinite(meter) && fields[0] && fields[2]
          ? {
              gameMode: fields[0],
              author: fields[1] ? fields[1] : null,
              difficultySlot: fields[2],
              meter,
            }
          : null,
      nextIndex: index,
    };
  }

  throw new Error("unterminated #NOTES block");
}

function parseSimfileText(text: string, simfileType: "ssc" | "sm") {
  const tags: Record<string, string> = {};
  const charts: ParsedSimfileChart[] = [];
  let currentChart: {
    gameMode: string;
    difficultySlot: string;
    meter: number | null;
    author: string | null;
  } | null = null;

  let index = 0;
  while (index < text.length) {
    const hashIndex = text.indexOf("#", index);
    if (hashIndex === -1) {
      break;
    }

    const colonIndex = text.indexOf(":", hashIndex);
    if (colonIndex === -1) {
      break;
    }

    const tagName = text.slice(hashIndex + 1, colonIndex).trim().toUpperCase();
    if (!tagName) {
      index = hashIndex + 1;
      continue;
    }

    if (tagName === "NOTEDATA") {
      index = skipTagValue(text, colonIndex + 1);
      currentChart = {
        gameMode: "",
        difficultySlot: "",
        meter: null,
        author: null,
      };
      continue;
    }

    if (tagName === "NOTES" && currentChart === null) {
      const parsed = parseSmNotesBlock(text, colonIndex + 1);
      if (parsed.chart) {
        charts.push(parsed.chart);
      }
      index = parsed.nextIndex;
      continue;
    }

    if (currentChart) {
      if (tagName === "NOTES") {
        if (currentChart.gameMode && currentChart.difficultySlot && Number.isFinite(currentChart.meter)) {
          charts.push({
            gameMode: currentChart.gameMode,
            difficultySlot: currentChart.difficultySlot,
            meter: currentChart.meter as number,
            author: currentChart.author,
          });
        }
        currentChart = null;
        index = skipTagValue(text, colonIndex + 1);
        continue;
      }

      const { value, nextIndex } = parseTagValue(text, colonIndex + 1);
      if (tagName === "STEPSTYPE") {
        currentChart.gameMode = value;
      } else if (tagName === "DIFFICULTY") {
        currentChart.difficultySlot = value;
      } else if (tagName === "METER") {
        const meter = Number.parseInt(value, 10);
        currentChart.meter = Number.isFinite(meter) ? meter : null;
      } else if (tagName === "CREDIT") {
        currentChart.author = value || null;
      }

      index = nextIndex;
      continue;
    }

    const { value, nextIndex } = parseTagValue(text, colonIndex + 1);
    tags[tagName] = value;
    index = nextIndex;
  }

  return { tags, charts, simfileType };
}

export function parseSimfile(filePath: string): ParsedSimfileResult {
  const simfileType: "ssc" | "sm" = path.extname(filePath).toLowerCase() === ".ssc" ? "ssc" : "sm";
  const result = createEmptyResult(simfileType);

  try {
    const rawBytes = fs.readFileSync(filePath);
    const decoded = decodeBytes(rawBytes);
    const parsed = parseSimfileText(cleanDecodedText(decoded.text), simfileType);

    return {
      ...result,
      tags: parsed.tags,
      charts: parsed.charts,
      encoding: decoded.encoding,
      encodingIssue: decoded.encodingIssue,
    };
  } catch (error) {
    return {
      ...result,
      parseError: error instanceof Error ? error.message : "Unable to parse simfile",
    };
  }
}
