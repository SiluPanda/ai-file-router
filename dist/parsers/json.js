"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonParser = void 0;
const DEFAULT_MAX_SIZE = 10 * 1024; // 10KB threshold
/**
 * JSON parser: pretty-prints JSON wrapped in a fenced code block.
 * Large JSON files get summarized.
 */
exports.jsonParser = {
    name: "json",
    formats: ["json"],
    canParse(input) {
        return input.formatInfo.format === "json";
    },
    async parse(input, _options) {
        const content = typeof input.content === "string"
            ? input.content
            : input.content.toString("utf-8");
        const warnings = [];
        let parsed;
        try {
            parsed = JSON.parse(content);
        }
        catch (e) {
            warnings.push(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
            // Return raw content in code fence
            return {
                content: "```json\n" + content.trim() + "\n```",
                format: "markdown",
                warnings,
            };
        }
        const pretty = JSON.stringify(parsed, null, 2);
        if (pretty.length <= DEFAULT_MAX_SIZE) {
            return {
                content: "```json\n" + pretty + "\n```",
                format: "markdown",
            };
        }
        // Large JSON: summarize structure
        const summary = summarizeJson(parsed);
        return {
            content: "```json\n" + summary + "\n```",
            format: "markdown",
            warnings: ["JSON content truncated due to size; showing structure summary"],
        };
    },
};
function summarizeJson(value, depth = 0, maxDepth = 3) {
    const indent = "  ".repeat(depth);
    if (depth >= maxDepth) {
        return `${indent}...`;
    }
    if (value === null)
        return `${indent}null`;
    if (typeof value === "string")
        return `${indent}"${value.length > 50 ? value.substring(0, 50) + "..." : value}"`;
    if (typeof value === "number" || typeof value === "boolean")
        return `${indent}${String(value)}`;
    if (Array.isArray(value)) {
        if (value.length === 0)
            return `${indent}[]`;
        const items = [];
        const showCount = Math.min(value.length, 2);
        for (let i = 0; i < showCount; i++) {
            items.push(summarizeJson(value[i], depth + 1, maxDepth));
        }
        if (value.length > showCount) {
            items.push(`${"  ".repeat(depth + 1)}... (${value.length} items total)`);
        }
        return `${indent}[\n${items.join(",\n")}\n${indent}]`;
    }
    if (typeof value === "object" && value !== null) {
        const keys = Object.keys(value);
        if (keys.length === 0)
            return `${indent}{}`;
        const entries = [];
        const showCount = Math.min(keys.length, 5);
        for (let i = 0; i < showCount; i++) {
            const k = keys[i];
            const v = summarizeJson(value[k], depth + 1, maxDepth);
            entries.push(`${"  ".repeat(depth + 1)}"${k}": ${v.trimStart()}`);
        }
        if (keys.length > showCount) {
            entries.push(`${"  ".repeat(depth + 1)}... (${keys.length} keys total)`);
        }
        return `${indent}{\n${entries.join(",\n")}\n${indent}}`;
    }
    return `${indent}${String(value)}`;
}
//# sourceMappingURL=json.js.map