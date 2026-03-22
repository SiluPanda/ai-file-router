import { Parser, ParserInput } from "./types.js";
/**
 * Parser registry: maps format identifiers to parser instances.
 * Supports three tiers in priority order:
 *   1. Custom parsers (registered by caller)
 *   2. Built-in parsers (ship with ai-file-router)
 */
export declare class ParserRegistry {
    private customParsers;
    private builtinParsers;
    constructor();
    /**
     * Register a custom parser. Custom parsers take highest priority.
     */
    register(parser: Parser): void;
    /**
     * Find the best parser for a given input.
     * Checks custom parsers first, then built-in parsers.
     */
    findParser(input: ParserInput): Parser | null;
    /**
     * Get all registered parsers.
     */
    getAllParsers(): Parser[];
    /**
     * Get all supported format identifiers.
     */
    getSupportedFormats(): string[];
    private registerBuiltins;
}
//# sourceMappingURL=registry.d.ts.map