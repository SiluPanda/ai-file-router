"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageParser = exports.binaryParser = void 0;
/**
 * Friendly format names for display.
 */
const FORMAT_NAMES = {
    pdf: "PDF",
    docx: "DOCX (Microsoft Word)",
    pptx: "PPTX (Microsoft PowerPoint)",
    xlsx: "XLSX (Microsoft Excel)",
    doc: "DOC (Legacy Microsoft Word)",
    ppt: "PPT (Legacy Microsoft PowerPoint)",
    xls: "XLS (Legacy Microsoft Excel)",
    odt: "ODT (OpenDocument Text)",
    rtf: "RTF (Rich Text Format)",
    zip: "ZIP Archive",
    gzip: "GZIP Compressed",
};
/**
 * Binary format parser: returns a helpful message for binary formats
 * that require external dependencies to decode.
 */
exports.binaryParser = {
    name: "binary",
    formats: ["pdf", "docx", "pptx", "xlsx", "doc", "ppt", "xls", "odt", "rtf", "zip", "gzip"],
    canParse(input) {
        return this.formats.includes(input.formatInfo.format);
    },
    async parse(input, _options) {
        const format = input.formatInfo.format;
        const name = FORMAT_NAMES[format] || format.toUpperCase();
        const warnings = [];
        // Legacy formats
        const legacyFormats = ["doc", "ppt", "xls"];
        if (legacyFormats.includes(format)) {
            warnings.push(`Legacy ${name} format detected. Consider converting to ${format}x for better compatibility.`);
        }
        const message = [
            `[${name} file detected]`,
            "",
            `Binary format -- requires external parser to extract content.`,
            "",
            "Suggested packages:",
            format === "pdf" ? "  - docling-node-ts (recommended)" : null,
            format === "pdf" ? "  - pdf-parse" : null,
            format === "docx" ? "  - docling-node-ts (recommended)" : null,
            format === "docx" ? "  - mammoth" : null,
            format === "pptx" ? "  - docling-node-ts (recommended)" : null,
            format === "xlsx" ? "  - xlsx (SheetJS)" : null,
            format === "odt" ? "  - jszip (for ZIP extraction)" : null,
            format === "rtf" ? "  - (built-in RTF text extraction not yet implemented)" : null,
            format === "zip" ? "  - jszip or adm-zip" : null,
            format === "gzip" ? "  - node:zlib (built-in)" : null,
            legacyFormats.includes(format) ? `  - Convert to .${format}x format first` : null,
        ]
            .filter(Boolean)
            .join("\n");
        return {
            content: message,
            format: "text",
            warnings,
        };
    },
};
/**
 * Image parser: returns a descriptive message for image files.
 */
exports.imageParser = {
    name: "image",
    formats: ["image"],
    canParse(input) {
        return input.formatInfo.format === "image";
    },
    async parse(input, _options) {
        const subtype = input.formatInfo.subtype || "unknown";
        const warnings = [];
        // SVG is actually text/XML
        if (subtype === "svg") {
            const content = typeof input.content === "string"
                ? input.content
                : input.content.toString("utf-8");
            return {
                content: "```svg\n" + content.trimEnd() + "\n```",
                format: "markdown",
            };
        }
        const size = typeof input.content === "string"
            ? Buffer.byteLength(input.content, "utf-8")
            : input.content.length;
        const message = [
            `[${subtype.toUpperCase()} image detected (${formatBytes(size)})]`,
            "",
            `Binary image format -- requires external parser for content extraction.`,
            "",
            "For OCR text extraction:",
            "  - tesseract.js",
            "",
            "For image description:",
            "  - Pass the image to a multimodal LLM (GPT-4V, Claude, etc.)",
        ].join("\n");
        return {
            content: message,
            format: "text",
            warnings,
        };
    },
};
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
//# sourceMappingURL=binary.js.map