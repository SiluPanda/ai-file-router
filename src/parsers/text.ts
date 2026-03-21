import { Parser, ParserInput, ParserOutput, RouteOptions } from "../types.js";

/**
 * Text parser: handles plain text and log files.
 * Passes through content with optional whitespace normalization.
 */
export const textParser: Parser = {
  name: "text",
  formats: ["text"],

  canParse(input: ParserInput): boolean {
    return input.formatInfo.format === "text";
  },

  async parse(input: ParserInput, _options?: RouteOptions): Promise<ParserOutput> {
    const content =
      typeof input.content === "string"
        ? input.content
        : input.content.toString("utf-8");

    // Normalize line endings and trim trailing whitespace
    const normalized = content
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+$/gm, "")
      .trimEnd();

    return {
      content: normalized,
      format: "text",
    };
  },
};

/**
 * Code parser: wraps source code in markdown fenced code blocks.
 */
export const codeParser: Parser = {
  name: "code",
  formats: ["code"],

  canParse(input: ParserInput): boolean {
    return input.formatInfo.format === "code";
  },

  async parse(input: ParserInput, options?: RouteOptions): Promise<ParserOutput> {
    const content =
      typeof input.content === "string"
        ? input.content
        : input.content.toString("utf-8");

    const language = input.formatInfo.language || "";
    const lines: string[] = [];

    // Optional header
    if (options?.codeOptions?.includeHeader && (input.fileName || input.filePath)) {
      const name = input.fileName || input.filePath || "";
      const langLabel = language ? ` (${language})` : "";
      lines.push(`## File: ${name}${langLabel}`, "");
    }

    lines.push(`\`\`\`${language}`);
    lines.push(content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd());
    lines.push("```");

    return {
      content: lines.join("\n"),
      format: "markdown",
    };
  },
};
