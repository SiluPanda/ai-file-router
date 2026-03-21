import { Parser, ParserInput, ParserOutput, RouteOptions } from "../types.js";

/**
 * CSV/TSV parser: converts tabular data to a markdown GFM table.
 * Hand-written parser following RFC 4180.
 */
export const csvParser: Parser = {
  name: "csv",
  formats: ["csv", "tsv"],

  canParse(input: ParserInput): boolean {
    return input.formatInfo.format === "csv" || input.formatInfo.format === "tsv";
  },

  async parse(input: ParserInput, _options?: RouteOptions): Promise<ParserOutput> {
    const content =
      typeof input.content === "string"
        ? input.content
        : input.content.toString("utf-8");

    const delimiter = input.formatInfo.format === "tsv" ? "\t" : ",";
    const rows = parseCSV(content, delimiter);

    if (rows.length === 0) {
      return {
        content: "(empty file)",
        format: "text",
      };
    }

    const md = rowsToMarkdownTable(rows);
    return {
      content: md,
      format: "markdown",
    };
  },
};

/**
 * Parse CSV/TSV content into rows of cells.
 * Handles quoted fields, escaped quotes, and multiline fields per RFC 4180.
 */
function parseCSV(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  // Normalize line endings
  const text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else {
      if (ch === '"' && currentField.length === 0) {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (ch === "\n") {
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  // Last field/row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Convert parsed rows into a markdown GFM table.
 */
function rowsToMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return "";

  // Normalize column count
  const maxCols = Math.max(...rows.map((r) => r.length));
  for (const row of rows) {
    while (row.length < maxCols) {
      row.push("");
    }
  }

  const lines: string[] = [];

  // Header row (first row)
  lines.push("| " + rows[0].map((c) => c.trim() || " ").join(" | ") + " |");
  // Separator
  lines.push("| " + rows[0].map(() => "---").join(" | ") + " |");
  // Data rows
  for (let i = 1; i < rows.length; i++) {
    lines.push("| " + rows[i].map((c) => c.trim() || " ").join(" | ") + " |");
  }

  return lines.join("\n");
}
