import { Parser, ParserInput, ParserOutput, RouteOptions } from "../types.js";

/**
 * YAML parser: wraps YAML content in a fenced code block.
 * No YAML parsing library needed — the goal is text representation.
 */
export const yamlParser: Parser = {
  name: "yaml",
  formats: ["yaml", "toml"],

  canParse(input: ParserInput): boolean {
    return input.formatInfo.format === "yaml" || input.formatInfo.format === "toml";
  },

  async parse(input: ParserInput, _options?: RouteOptions): Promise<ParserOutput> {
    const content =
      typeof input.content === "string"
        ? input.content
        : input.content.toString("utf-8");

    const format = input.formatInfo.format; // 'yaml' or 'toml'

    // Normalize line endings, trim trailing whitespace
    const cleaned = content
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trimEnd();

    return {
      content: `\`\`\`${format}\n${cleaned}\n\`\`\``,
      format: "markdown",
    };
  },
};
