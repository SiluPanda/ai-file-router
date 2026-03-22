"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserRegistry = void 0;
const text_js_1 = require("./parsers/text.js");
const markdown_js_1 = require("./parsers/markdown.js");
const html_js_1 = require("./parsers/html.js");
const json_js_1 = require("./parsers/json.js");
const csv_js_1 = require("./parsers/csv.js");
const yaml_js_1 = require("./parsers/yaml.js");
const binary_js_1 = require("./parsers/binary.js");
/**
 * Parser registry: maps format identifiers to parser instances.
 * Supports three tiers in priority order:
 *   1. Custom parsers (registered by caller)
 *   2. Built-in parsers (ship with ai-file-router)
 */
class ParserRegistry {
    customParsers = [];
    builtinParsers = [];
    constructor() {
        this.registerBuiltins();
    }
    /**
     * Register a custom parser. Custom parsers take highest priority.
     */
    register(parser) {
        this.customParsers.push(parser);
    }
    /**
     * Find the best parser for a given input.
     * Checks custom parsers first, then built-in parsers.
     */
    findParser(input) {
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
    getAllParsers() {
        return [...this.customParsers, ...this.builtinParsers];
    }
    /**
     * Get all supported format identifiers.
     */
    getSupportedFormats() {
        const formats = new Set();
        for (const parser of this.getAllParsers()) {
            for (const fmt of parser.formats) {
                formats.add(fmt);
            }
        }
        return Array.from(formats);
    }
    registerBuiltins() {
        this.builtinParsers = [
            text_js_1.textParser,
            text_js_1.codeParser,
            markdown_js_1.markdownParser,
            html_js_1.htmlParser,
            json_js_1.jsonParser,
            csv_js_1.csvParser,
            yaml_js_1.yamlParser,
            binary_js_1.binaryParser,
            binary_js_1.imageParser,
        ];
    }
}
exports.ParserRegistry = ParserRegistry;
//# sourceMappingURL=registry.js.map