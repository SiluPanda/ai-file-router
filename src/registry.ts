import { Parser, ParserInput } from "./types.js";
import { textParser, codeParser } from "./parsers/text.js";
import { markdownParser } from "./parsers/markdown.js";
import { htmlParser } from "./parsers/html.js";
import { jsonParser } from "./parsers/json.js";
import { csvParser } from "./parsers/csv.js";
import { yamlParser } from "./parsers/yaml.js";
import { binaryParser, imageParser } from "./parsers/binary.js";

/**
 * Parser registry: maps format identifiers to parser instances.
 * Supports three tiers in priority order:
 *   1. Custom parsers (registered by caller)
 *   2. Built-in parsers (ship with ai-file-router)
 */
export class ParserRegistry {
  private customParsers: Parser[] = [];
  private builtinParsers: Parser[] = [];

  constructor() {
    this.registerBuiltins();
  }

  /**
   * Register a custom parser. Custom parsers take highest priority.
   */
  register(parser: Parser): void {
    this.customParsers.push(parser);
  }

  /**
   * Find the best parser for a given input.
   * Checks custom parsers first, then built-in parsers.
   */
  findParser(input: ParserInput): Parser | null {
    // 1. Custom parsers (highest priority)
    for (const parser of this.customParsers) {
      if (parser.canParse(input)) {
        return parser;
      }
    }

    // 2. Built-in parsers
    for (const parser of this.builtinParsers) {
      if (parser.canParse(input)) {
        return parser;
      }
    }

    return null;
  }

  /**
   * Get all registered parsers.
   */
  getAllParsers(): Parser[] {
    return [...this.customParsers, ...this.builtinParsers];
  }

  /**
   * Get all supported format identifiers.
   */
  getSupportedFormats(): string[] {
    const formats = new Set<string>();
    for (const parser of this.getAllParsers()) {
      for (const fmt of parser.formats) {
        formats.add(fmt);
      }
    }
    return Array.from(formats);
  }

  private registerBuiltins(): void {
    this.builtinParsers = [
      textParser,
      codeParser,
      markdownParser,
      htmlParser,
      jsonParser,
      csvParser,
      yamlParser,
      binaryParser,
      imageParser,
    ];
  }
}
