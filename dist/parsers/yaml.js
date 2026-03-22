"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yamlParser = void 0;
/**
 * YAML parser: wraps YAML content in a fenced code block.
 * No YAML parsing library needed — the goal is text representation.
 */
exports.yamlParser = {
    name: "yaml",
    formats: ["yaml", "toml"],
    canParse(input) {
        return input.formatInfo.format === "yaml" || input.formatInfo.format === "toml";
    },
    async parse(input, _options) {
        const content = typeof input.content === "string"
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
//# sourceMappingURL=yaml.js.map