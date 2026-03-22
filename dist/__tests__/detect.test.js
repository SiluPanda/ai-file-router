"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const detect_js_1 = require("../detect.js");
(0, vitest_1.describe)("detectFormat", () => {
    (0, vitest_1.describe)("explicit format override", () => {
        (0, vitest_1.it)("returns explicit format with confidence 1.0", () => {
            const result = (0, detect_js_1.detectFormat)({ format: "pdf" });
            (0, vitest_1.expect)(result.format).toBe("pdf");
            (0, vitest_1.expect)(result.confidence).toBe(1.0);
            (0, vitest_1.expect)(result.method).toBe("explicit");
        });
        (0, vitest_1.it)("uses explicit format even when content and extension disagree", () => {
            const result = (0, detect_js_1.detectFormat)({
                content: Buffer.from("hello world"),
                filePath: "test.csv",
                format: "json",
            });
            (0, vitest_1.expect)(result.format).toBe("json");
        });
    });
    (0, vitest_1.describe)("magic bytes detection", () => {
        (0, vitest_1.it)("detects PDF from magic bytes", () => {
            const buf = Buffer.from("%PDF-1.7 some content here");
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("pdf");
            (0, vitest_1.expect)(result.confidence).toBe(1.0);
            (0, vitest_1.expect)(result.method).toBe("magic-bytes");
            (0, vitest_1.expect)(result.mimeType).toBe("application/pdf");
        });
        (0, vitest_1.it)("detects PNG from magic bytes", () => {
            const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("image");
            (0, vitest_1.expect)(result.subtype).toBe("png");
            (0, vitest_1.expect)(result.mimeType).toBe("image/png");
        });
        (0, vitest_1.it)("detects JPEG from magic bytes", () => {
            const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("image");
            (0, vitest_1.expect)(result.subtype).toBe("jpeg");
        });
        (0, vitest_1.it)("detects GIF from magic bytes", () => {
            const buf = Buffer.from("GIF89a" + "\x00".repeat(10));
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("image");
            (0, vitest_1.expect)(result.subtype).toBe("gif");
        });
        (0, vitest_1.it)("detects BMP from magic bytes", () => {
            const buf = Buffer.from([0x42, 0x4d, 0x00, 0x00, 0x00, 0x00]);
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("image");
            (0, vitest_1.expect)(result.subtype).toBe("bmp");
        });
        (0, vitest_1.it)("detects TIFF (little-endian) from magic bytes", () => {
            const buf = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x00, 0x00]);
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("image");
            (0, vitest_1.expect)(result.subtype).toBe("tiff");
        });
        (0, vitest_1.it)("detects TIFF (big-endian) from magic bytes", () => {
            const buf = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00]);
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("image");
            (0, vitest_1.expect)(result.subtype).toBe("tiff");
        });
        (0, vitest_1.it)("detects WEBP from magic bytes", () => {
            const buf = Buffer.alloc(16);
            buf.write("RIFF", 0);
            buf.writeUInt32LE(1000, 4);
            buf.write("WEBP", 8);
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("image");
            (0, vitest_1.expect)(result.subtype).toBe("webp");
            (0, vitest_1.expect)(result.mimeType).toBe("image/webp");
        });
        (0, vitest_1.it)("detects RTF from magic bytes", () => {
            const buf = Buffer.from("{\\rtf1\\ansi some rtf content}");
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("rtf");
            (0, vitest_1.expect)(result.confidence).toBe(1.0);
        });
        (0, vitest_1.it)("detects ZIP from magic bytes", () => {
            const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            // Without extension, ZIP stays as zip
            (0, vitest_1.expect)(result.format).toBe("zip");
            (0, vitest_1.expect)(result.confidence).toBe(0.9);
        });
        (0, vitest_1.it)("disambiguates ZIP as DOCX with .docx extension", () => {
            const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
            const result = (0, detect_js_1.detectFormat)({ content: buf, filePath: "document.docx" });
            (0, vitest_1.expect)(result.format).toBe("docx");
            (0, vitest_1.expect)(result.confidence).toBe(0.9);
        });
        (0, vitest_1.it)("disambiguates ZIP as PPTX with .pptx extension", () => {
            const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
            const result = (0, detect_js_1.detectFormat)({ content: buf, filePath: "slides.pptx" });
            (0, vitest_1.expect)(result.format).toBe("pptx");
        });
        (0, vitest_1.it)("disambiguates ZIP as XLSX with .xlsx extension", () => {
            const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
            const result = (0, detect_js_1.detectFormat)({ content: buf, filePath: "data.xlsx" });
            (0, vitest_1.expect)(result.format).toBe("xlsx");
        });
        (0, vitest_1.it)("returns gzip for gzip magic bytes", () => {
            const buf = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00]);
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("gzip");
        });
    });
    (0, vitest_1.describe)("MIME type detection", () => {
        (0, vitest_1.it)("detects format from MIME type", () => {
            const result = (0, detect_js_1.detectFormat)({ mimeType: "application/pdf" });
            (0, vitest_1.expect)(result.format).toBe("pdf");
            (0, vitest_1.expect)(result.confidence).toBe(0.8);
            (0, vitest_1.expect)(result.method).toBe("mime-type");
        });
        (0, vitest_1.it)("detects HTML from MIME type", () => {
            const result = (0, detect_js_1.detectFormat)({ mimeType: "text/html" });
            (0, vitest_1.expect)(result.format).toBe("html");
        });
        (0, vitest_1.it)("detects JSON from MIME type", () => {
            const result = (0, detect_js_1.detectFormat)({ mimeType: "application/json" });
            (0, vitest_1.expect)(result.format).toBe("json");
        });
        (0, vitest_1.it)("detects CSV from MIME type", () => {
            const result = (0, detect_js_1.detectFormat)({ mimeType: "text/csv" });
            (0, vitest_1.expect)(result.format).toBe("csv");
        });
        (0, vitest_1.it)("detects YAML from MIME type", () => {
            const result = (0, detect_js_1.detectFormat)({ mimeType: "application/x-yaml" });
            (0, vitest_1.expect)(result.format).toBe("yaml");
        });
        (0, vitest_1.it)("detects image/png from MIME type", () => {
            const result = (0, detect_js_1.detectFormat)({ mimeType: "image/png" });
            (0, vitest_1.expect)(result.format).toBe("image");
            (0, vitest_1.expect)(result.subtype).toBe("png");
        });
        (0, vitest_1.it)("detects image/svg+xml from MIME type", () => {
            const result = (0, detect_js_1.detectFormat)({ mimeType: "image/svg+xml" });
            (0, vitest_1.expect)(result.format).toBe("image");
            (0, vitest_1.expect)(result.subtype).toBe("svg");
        });
        (0, vitest_1.it)("ignores application/octet-stream MIME type", () => {
            const result = (0, detect_js_1.detectFormat)({ mimeType: "application/octet-stream", filePath: "test.json" });
            (0, vitest_1.expect)(result.format).toBe("json");
            (0, vitest_1.expect)(result.method).toBe("extension");
        });
        (0, vitest_1.it)("magic bytes take priority over MIME type", () => {
            const buf = Buffer.from("%PDF-1.7 content");
            const result = (0, detect_js_1.detectFormat)({ content: buf, mimeType: "text/plain" });
            (0, vitest_1.expect)(result.format).toBe("pdf");
            (0, vitest_1.expect)(result.method).toBe("magic-bytes");
        });
    });
    (0, vitest_1.describe)("extension-based detection", () => {
        (0, vitest_1.it)("detects PDF from extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "document.pdf" });
            (0, vitest_1.expect)(result.format).toBe("pdf");
            (0, vitest_1.expect)(result.confidence).toBe(0.6);
            (0, vitest_1.expect)(result.method).toBe("extension");
        });
        (0, vitest_1.it)("detects DOCX from extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "report.docx" });
            (0, vitest_1.expect)(result.format).toBe("docx");
        });
        (0, vitest_1.it)("detects CSV from extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "data.csv" });
            (0, vitest_1.expect)(result.format).toBe("csv");
        });
        (0, vitest_1.it)("detects TSV from extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "data.tsv" });
            (0, vitest_1.expect)(result.format).toBe("tsv");
        });
        (0, vitest_1.it)("detects HTML from .html extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "page.html" });
            (0, vitest_1.expect)(result.format).toBe("html");
        });
        (0, vitest_1.it)("detects HTML from .htm extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "page.htm" });
            (0, vitest_1.expect)(result.format).toBe("html");
        });
        (0, vitest_1.it)("detects Markdown from .md extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "README.md" });
            (0, vitest_1.expect)(result.format).toBe("markdown");
        });
        (0, vitest_1.it)("detects Markdown from .markdown extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "notes.markdown" });
            (0, vitest_1.expect)(result.format).toBe("markdown");
        });
        (0, vitest_1.it)("detects JSON from extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "config.json" });
            (0, vitest_1.expect)(result.format).toBe("json");
        });
        (0, vitest_1.it)("detects YAML from .yaml extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "config.yaml" });
            (0, vitest_1.expect)(result.format).toBe("yaml");
        });
        (0, vitest_1.it)("detects YAML from .yml extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "config.yml" });
            (0, vitest_1.expect)(result.format).toBe("yaml");
        });
        (0, vitest_1.it)("detects TOML from extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "config.toml" });
            (0, vitest_1.expect)(result.format).toBe("toml");
        });
        (0, vitest_1.it)("detects plain text from .txt extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "notes.txt" });
            (0, vitest_1.expect)(result.format).toBe("text");
        });
        (0, vitest_1.it)("detects plain text from .log extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "app.log" });
            (0, vitest_1.expect)(result.format).toBe("text");
        });
        (0, vitest_1.it)("detects RTF from extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "document.rtf" });
            (0, vitest_1.expect)(result.format).toBe("rtf");
        });
        (0, vitest_1.it)("detects XML from extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "data.xml" });
            (0, vitest_1.expect)(result.format).toBe("xml");
        });
        (0, vitest_1.it)("detects RST from extension", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "docs.rst" });
            (0, vitest_1.expect)(result.format).toBe("rst");
        });
        (0, vitest_1.it)("detects legacy doc format", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "old.doc" });
            (0, vitest_1.expect)(result.format).toBe("doc");
        });
        (0, vitest_1.it)("detects legacy xls format", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "old.xls" });
            (0, vitest_1.expect)(result.format).toBe("xls");
        });
        (0, vitest_1.it)("detects legacy ppt format", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "old.ppt" });
            (0, vitest_1.expect)(result.format).toBe("ppt");
        });
    });
    (0, vitest_1.describe)("code file detection", () => {
        const codeTests = [
            { ext: ".js", lang: "javascript" },
            { ext: ".mjs", lang: "javascript" },
            { ext: ".cjs", lang: "javascript" },
            { ext: ".ts", lang: "typescript" },
            { ext: ".mts", lang: "typescript" },
            { ext: ".tsx", lang: "typescript" },
            { ext: ".py", lang: "python" },
            { ext: ".rs", lang: "rust" },
            { ext: ".go", lang: "go" },
            { ext: ".java", lang: "java" },
            { ext: ".c", lang: "c" },
            { ext: ".h", lang: "c" },
            { ext: ".cpp", lang: "cpp" },
            { ext: ".cc", lang: "cpp" },
            { ext: ".cs", lang: "csharp" },
            { ext: ".rb", lang: "ruby" },
            { ext: ".php", lang: "php" },
            { ext: ".swift", lang: "swift" },
            { ext: ".kt", lang: "kotlin" },
            { ext: ".scala", lang: "scala" },
            { ext: ".sh", lang: "bash" },
            { ext: ".bash", lang: "bash" },
            { ext: ".zsh", lang: "bash" },
            { ext: ".sql", lang: "sql" },
            { ext: ".r", lang: "r" },
            { ext: ".lua", lang: "lua" },
            { ext: ".pl", lang: "perl" },
            { ext: ".ex", lang: "elixir" },
            { ext: ".erl", lang: "erlang" },
            { ext: ".hs", lang: "haskell" },
            { ext: ".dart", lang: "dart" },
            { ext: ".vue", lang: "vue" },
            { ext: ".svelte", lang: "svelte" },
            { ext: ".css", lang: "css" },
            { ext: ".scss", lang: "scss" },
            { ext: ".less", lang: "less" },
            { ext: ".graphql", lang: "graphql" },
            { ext: ".proto", lang: "protobuf" },
            { ext: ".tf", lang: "hcl" },
        ];
        for (const { ext, lang } of codeTests) {
            (0, vitest_1.it)(`detects ${ext} as code (${lang})`, () => {
                const result = (0, detect_js_1.detectFormat)({ filePath: `test${ext}` });
                (0, vitest_1.expect)(result.format).toBe("code");
                (0, vitest_1.expect)(result.language).toBe(lang);
            });
        }
        (0, vitest_1.it)("detects Dockerfile by filename", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "Dockerfile" });
            (0, vitest_1.expect)(result.format).toBe("code");
            (0, vitest_1.expect)(result.language).toBe("dockerfile");
        });
        (0, vitest_1.it)("detects Makefile by filename", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "Makefile" });
            (0, vitest_1.expect)(result.format).toBe("code");
            (0, vitest_1.expect)(result.language).toBe("makefile");
        });
    });
    (0, vitest_1.describe)("image format detection", () => {
        const imageTests = [
            { ext: ".png", subtype: "png" },
            { ext: ".jpg", subtype: "jpeg" },
            { ext: ".jpeg", subtype: "jpeg" },
            { ext: ".gif", subtype: "gif" },
            { ext: ".webp", subtype: "webp" },
            { ext: ".tiff", subtype: "tiff" },
            { ext: ".tif", subtype: "tiff" },
            { ext: ".bmp", subtype: "bmp" },
            { ext: ".svg", subtype: "svg" },
        ];
        for (const { ext, subtype } of imageTests) {
            (0, vitest_1.it)(`detects ${ext} as image (${subtype})`, () => {
                const result = (0, detect_js_1.detectFormat)({ filePath: `image${ext}` });
                (0, vitest_1.expect)(result.format).toBe("image");
                (0, vitest_1.expect)(result.subtype).toBe(subtype);
            });
        }
    });
    (0, vitest_1.describe)("content heuristic detection", () => {
        (0, vitest_1.it)("detects JSON from content", () => {
            const result = (0, detect_js_1.detectFormat)({ content: '{"key": "value"}' });
            (0, vitest_1.expect)(result.format).toBe("json");
            (0, vitest_1.expect)(result.confidence).toBe(0.5);
            (0, vitest_1.expect)(result.method).toBe("content-heuristic");
        });
        (0, vitest_1.it)("detects JSON array from content", () => {
            const result = (0, detect_js_1.detectFormat)({ content: '[1, 2, 3]' });
            (0, vitest_1.expect)(result.format).toBe("json");
        });
        (0, vitest_1.it)("detects HTML from content", () => {
            const result = (0, detect_js_1.detectFormat)({ content: "<html><body>Hello</body></html>" });
            (0, vitest_1.expect)(result.format).toBe("html");
            (0, vitest_1.expect)(result.method).toBe("content-heuristic");
        });
        (0, vitest_1.it)("detects HTML from DOCTYPE", () => {
            const result = (0, detect_js_1.detectFormat)({ content: "<!doctype html><html></html>" });
            (0, vitest_1.expect)(result.format).toBe("html");
        });
        (0, vitest_1.it)("detects XML from content", () => {
            const result = (0, detect_js_1.detectFormat)({ content: "<?xml version='1.0'?><root></root>" });
            (0, vitest_1.expect)(result.format).toBe("xml");
        });
        (0, vitest_1.it)("detects YAML from --- delimiter", () => {
            const result = (0, detect_js_1.detectFormat)({ content: "---\nkey: value\nother: 42\n" });
            (0, vitest_1.expect)(result.format).toBe("yaml");
        });
        (0, vitest_1.it)("detects Markdown from # header", () => {
            const result = (0, detect_js_1.detectFormat)({ content: "# My Document\n\nSome content here." });
            (0, vitest_1.expect)(result.format).toBe("markdown");
        });
        (0, vitest_1.it)("falls back to text for plain text content", () => {
            const result = (0, detect_js_1.detectFormat)({ content: "Just some plain text without any markers." });
            (0, vitest_1.expect)(result.format).toBe("text");
            (0, vitest_1.expect)(result.confidence).toBe(0.3);
        });
        (0, vitest_1.it)("returns unknown for binary content without magic bytes", () => {
            const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
            const result = (0, detect_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(result.format).toBe("unknown");
        });
    });
    (0, vitest_1.describe)("fileName hint", () => {
        (0, vitest_1.it)("uses fileName for extension detection when no filePath", () => {
            const result = (0, detect_js_1.detectFormat)({ content: "some content", fileName: "data.csv" });
            (0, vitest_1.expect)(result.format).toBe("csv");
        });
    });
    (0, vitest_1.describe)("detection priority", () => {
        (0, vitest_1.it)("magic bytes win over MIME type", () => {
            const buf = Buffer.from("%PDF-1.4");
            const result = (0, detect_js_1.detectFormat)({ content: buf, mimeType: "text/plain" });
            (0, vitest_1.expect)(result.format).toBe("pdf");
        });
        (0, vitest_1.it)("magic bytes win over extension", () => {
            const buf = Buffer.from("%PDF-1.4");
            const result = (0, detect_js_1.detectFormat)({ content: buf, filePath: "file.txt" });
            (0, vitest_1.expect)(result.format).toBe("pdf");
        });
        (0, vitest_1.it)("MIME type wins over extension", () => {
            const result = (0, detect_js_1.detectFormat)({ mimeType: "application/json", filePath: "file.txt" });
            (0, vitest_1.expect)(result.format).toBe("json");
        });
        (0, vitest_1.it)("extension used when no other signal", () => {
            const result = (0, detect_js_1.detectFormat)({ filePath: "file.py" });
            (0, vitest_1.expect)(result.format).toBe("code");
            (0, vitest_1.expect)(result.language).toBe("python");
        });
    });
});
//# sourceMappingURL=detect.test.js.map