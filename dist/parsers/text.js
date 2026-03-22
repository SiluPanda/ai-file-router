"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeParser = exports.textParser = void 0;
/**
 * Text parser: handles plain text and log files.
 * Passes through content with optional whitespace normalization.
 */
exports.textParser = {
    name: "text",
    formats: ["text"],
    canParse(input) {
        return input.formatInfo.format === "text";
    },
    async parse(input, _options) {
        const content = typeof input.content === "string"
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
exports.codeParser = {
    name: "code",
    formats: ["code"],
    canParse(input) {
        return input.formatInfo.format === "code";
    },
    async parse(input, options) {
        const content = typeof input.content === "string"
            ? input.content
            : input.content.toString("utf-8");
        const language = input.formatInfo.language || "";
        const lines = [];
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
//# sourceMappingURL=text.js.map