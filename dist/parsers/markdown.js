"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownParser = void 0;
/**
 * Markdown parser: passes through markdown with cleanup.
 */
exports.markdownParser = {
    name: "markdown",
    formats: ["markdown"],
    canParse(input) {
        return input.formatInfo.format === "markdown";
    },
    async parse(input, options) {
        const content = typeof input.content === "string"
            ? input.content
            : input.content.toString("utf-8");
        // Normalize line endings, remove trailing whitespace per line
        let cleaned = content
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/[ \t]+$/gm, "")
            .trimEnd();
        // Collapse 3+ consecutive blank lines to 2
        cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
        // If caller wants plain text, strip markdown formatting
        if (options?.outputFormat === "text") {
            cleaned = stripMarkdown(cleaned);
            return { content: cleaned, format: "text" };
        }
        return {
            content: cleaned,
            format: "markdown",
        };
    },
};
/**
 * Simple markdown stripping: removes headers, bold, italic, links, images, code fences.
 */
function stripMarkdown(md) {
    let text = md;
    // Remove code fences
    text = text.replace(/```[\s\S]*?```/g, "");
    // Remove inline code
    text = text.replace(/`([^`]+)`/g, "$1");
    // Remove images
    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
    // Remove links, keep text
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    // Remove headers
    text = text.replace(/^#{1,6}\s+/gm, "");
    // Remove bold/italic
    text = text.replace(/\*\*(.+?)\*\*/g, "$1");
    text = text.replace(/\*(.+?)\*/g, "$1");
    text = text.replace(/__(.+?)__/g, "$1");
    text = text.replace(/_(.+?)_/g, "$1");
    // Remove horizontal rules
    text = text.replace(/^[-*_]{3,}\s*$/gm, "");
    return text.trim();
}
//# sourceMappingURL=markdown.js.map