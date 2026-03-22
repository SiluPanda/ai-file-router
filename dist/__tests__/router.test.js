"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
const router_js_1 = require("../router.js");
function createTempFile(name, content) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-file-router-test-"));
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, content);
    return filePath;
}
function cleanup(filePath) {
    try {
        fs.unlinkSync(filePath);
        fs.rmdirSync(path.dirname(filePath));
    }
    catch {
        // ignore cleanup errors
    }
}
(0, vitest_1.describe)("route", () => {
    (0, vitest_1.describe)("routing text files", () => {
        (0, vitest_1.it)("routes a text file from path", async () => {
            const fp = createTempFile("test.txt", "Hello, world!");
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.content).toBe("Hello, world!");
                (0, vitest_1.expect)(result.format).toBe("text");
                (0, vitest_1.expect)(result.sourceFormat).toBe("text");
                (0, vitest_1.expect)(result.metadata.filePath).toBe(fp);
                (0, vitest_1.expect)(result.metadata.fileName).toBe("test.txt");
                (0, vitest_1.expect)(result.metadata.fileSize).toBeDefined();
                (0, vitest_1.expect)(result.metadata.wordCount).toBe(2);
                (0, vitest_1.expect)(result.warnings).toHaveLength(0);
                (0, vitest_1.expect)(result.durationMs).toBeGreaterThanOrEqual(0);
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("routes text content as inline string (with format hint)", async () => {
            const result = await (0, router_js_1.route)("Hello inline text", { format: "text" });
            (0, vitest_1.expect)(result.content).toBe("Hello inline text");
            (0, vitest_1.expect)(result.format).toBe("text");
        });
        (0, vitest_1.it)("routes a Buffer with fileName hint", async () => {
            const buf = Buffer.from("Buffer content");
            const result = await (0, router_js_1.route)(buf, { fileName: "test.txt" });
            (0, vitest_1.expect)(result.content).toBe("Buffer content");
            (0, vitest_1.expect)(result.sourceFormat).toBe("text");
        });
    });
    (0, vitest_1.describe)("routing code files", () => {
        (0, vitest_1.it)("routes a TypeScript file", async () => {
            const fp = createTempFile("index.ts", 'const x: number = 42;\nconsole.log(x);');
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.format).toBe("markdown");
                (0, vitest_1.expect)(result.sourceFormat).toBe("code");
                (0, vitest_1.expect)(result.content).toContain("```typescript");
                (0, vitest_1.expect)(result.content).toContain("const x: number = 42;");
                (0, vitest_1.expect)(result.content).toContain("```");
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("routes a Python file", async () => {
            const fp = createTempFile("script.py", 'print("hello")');
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.content).toContain("```python");
                (0, vitest_1.expect)(result.content).toContain('print("hello")');
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("routes a JavaScript file", async () => {
            const fp = createTempFile("app.js", "function greet() { return 'hi'; }");
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.content).toContain("```javascript");
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("includes header when codeOptions.includeHeader is set", async () => {
            const fp = createTempFile("util.ts", "export const x = 1;");
            try {
                const result = await (0, router_js_1.route)(fp, { codeOptions: { includeHeader: true } });
                (0, vitest_1.expect)(result.content).toContain("## File:");
                (0, vitest_1.expect)(result.content).toContain("typescript");
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("routing markdown files", () => {
        (0, vitest_1.it)("routes a markdown file", async () => {
            const fp = createTempFile("readme.md", "# Title\n\nSome content.");
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.format).toBe("markdown");
                (0, vitest_1.expect)(result.sourceFormat).toBe("markdown");
                (0, vitest_1.expect)(result.content).toContain("# Title");
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("routing HTML files", () => {
        (0, vitest_1.it)("routes an HTML file", async () => {
            const fp = createTempFile("page.html", "<h1>Hello</h1><p>World</p>");
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.format).toBe("markdown");
                (0, vitest_1.expect)(result.sourceFormat).toBe("html");
                (0, vitest_1.expect)(result.content).toContain("# Hello");
                (0, vitest_1.expect)(result.content).toContain("World");
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("routing JSON files", () => {
        (0, vitest_1.it)("routes a JSON file", async () => {
            const fp = createTempFile("config.json", '{"key": "value"}');
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.format).toBe("markdown");
                (0, vitest_1.expect)(result.sourceFormat).toBe("json");
                (0, vitest_1.expect)(result.content).toContain("```json");
                (0, vitest_1.expect)(result.content).toContain('"key": "value"');
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("routing CSV files", () => {
        (0, vitest_1.it)("routes a CSV file", async () => {
            const fp = createTempFile("data.csv", "Name,Age\nAlice,30\nBob,25");
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.format).toBe("markdown");
                (0, vitest_1.expect)(result.sourceFormat).toBe("csv");
                (0, vitest_1.expect)(result.content).toContain("| Name | Age |");
                (0, vitest_1.expect)(result.content).toContain("| Alice | 30 |");
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("routes a TSV file", async () => {
            const fp = createTempFile("data.tsv", "Name\tAge\nAlice\t30");
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("tsv");
                (0, vitest_1.expect)(result.content).toContain("| Name | Age |");
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("routing YAML files", () => {
        (0, vitest_1.it)("routes a YAML file", async () => {
            const fp = createTempFile("config.yaml", "name: test\nversion: 1.0");
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.format).toBe("markdown");
                (0, vitest_1.expect)(result.sourceFormat).toBe("yaml");
                (0, vitest_1.expect)(result.content).toContain("```yaml");
                (0, vitest_1.expect)(result.content).toContain("name: test");
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("routes a TOML file", async () => {
            const fp = createTempFile("config.toml", '[package]\nname = "test"');
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("toml");
                (0, vitest_1.expect)(result.content).toContain("```toml");
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("routing binary files", () => {
        (0, vitest_1.it)("routes a PDF file (returns helpful message)", async () => {
            const buf = Buffer.from("%PDF-1.7 fake pdf content here");
            const fp = createTempFile("document.pdf", buf);
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("pdf");
                (0, vitest_1.expect)(result.content).toContain("PDF file detected");
                (0, vitest_1.expect)(result.content).toContain("requires external parser");
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("routes a DOCX file (ZIP magic bytes)", async () => {
            const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
            const fp = createTempFile("report.docx", buf);
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("docx");
                (0, vitest_1.expect)(result.content).toContain("DOCX");
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("routing image files", () => {
        (0, vitest_1.it)("routes a PNG image", async () => {
            const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
            const fp = createTempFile("image.png", buf);
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("image");
                (0, vitest_1.expect)(result.content).toContain("PNG image detected");
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("routes an SVG image as text", async () => {
            const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
            const fp = createTempFile("icon.svg", svg);
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("image");
                (0, vitest_1.expect)(result.content).toContain("```svg");
                (0, vitest_1.expect)(result.content).toContain("<rect/>");
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("format override", () => {
        (0, vitest_1.it)("uses format override to force JSON parsing", async () => {
            const content = '{"name": "test"}';
            const result = await (0, router_js_1.route)(content, { format: "json" });
            (0, vitest_1.expect)(result.sourceFormat).toBe("json");
            (0, vitest_1.expect)(result.content).toContain("```json");
        });
        (0, vitest_1.it)("uses MIME type hint", async () => {
            const buf = Buffer.from("name,age\nAlice,30");
            const result = await (0, router_js_1.route)(buf, { mimeType: "text/csv", fileName: "data" });
            (0, vitest_1.expect)(result.sourceFormat).toBe("csv");
        });
    });
    (0, vitest_1.describe)("maxSize truncation", () => {
        (0, vitest_1.it)("truncates output when maxSize is set", async () => {
            const longContent = "x".repeat(1000);
            const result = await (0, router_js_1.route)(longContent, { format: "text", maxSize: 100 });
            (0, vitest_1.expect)(result.content.length).toBe(100);
            (0, vitest_1.expect)(result.warnings).toContain("Output truncated to 100 characters");
        });
        (0, vitest_1.it)("does not truncate when content is within maxSize", async () => {
            const result = await (0, router_js_1.route)("short", { format: "text", maxSize: 1000 });
            (0, vitest_1.expect)(result.content).toBe("short");
            (0, vitest_1.expect)(result.warnings).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)("error handling", () => {
        (0, vitest_1.it)("returns error result for non-existent file", async () => {
            const result = await (0, router_js_1.route)("/tmp/this-file-definitely-does-not-exist-12345.txt");
            (0, vitest_1.expect)(result.content).toBe("");
            (0, vitest_1.expect)(result.warnings.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.warnings.some((w) => w.includes("Failed to read file"))).toBe(true);
        });
        (0, vitest_1.it)("returns error for unknown format Buffer with no hints", async () => {
            const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
            const result = await (0, router_js_1.route)(buf);
            (0, vitest_1.expect)(result.content).toBe("");
            (0, vitest_1.expect)(result.warnings.some((w) => w.includes("Unable to detect"))).toBe(true);
        });
    });
    (0, vitest_1.describe)("metadata", () => {
        (0, vitest_1.it)("includes word count in metadata", async () => {
            const result = await (0, router_js_1.route)("one two three four five", { format: "text" });
            (0, vitest_1.expect)(result.metadata.wordCount).toBe(5);
        });
        (0, vitest_1.it)("includes duration in result", async () => {
            const result = await (0, router_js_1.route)("test", { format: "text" });
            (0, vitest_1.expect)(typeof result.durationMs).toBe("number");
            (0, vitest_1.expect)(result.durationMs).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)("includes mimeType when detected", async () => {
            const fp = createTempFile("test.json", "{}");
            try {
                const result = await (0, router_js_1.route)(fp);
                (0, vitest_1.expect)(result.mimeType).toBe("application/json");
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("custom parser registration", () => {
        (0, vitest_1.it)("uses a registered custom parser", async () => {
            const customParser = {
                name: "my-custom",
                formats: ["custom_test_format"],
                canParse: (input) => input.formatInfo.format === "custom_test_format",
                parse: async () => ({
                    content: "custom parser output!",
                    format: "text",
                }),
            };
            (0, router_js_1.registerParser)(customParser);
            const result = await (0, router_js_1.route)("anything", { format: "custom_test_format" });
            (0, vitest_1.expect)(result.content).toBe("custom parser output!");
            (0, vitest_1.expect)(result.sourceFormat).toBe("custom_test_format");
        });
    });
    (0, vitest_1.describe)("content-based detection for inline strings", () => {
        (0, vitest_1.it)("detects JSON content when passed as Buffer", async () => {
            const buf = Buffer.from('{"hello": "world"}');
            const result = await (0, router_js_1.route)(buf);
            (0, vitest_1.expect)(result.sourceFormat).toBe("json");
            (0, vitest_1.expect)(result.content).toContain("```json");
        });
        (0, vitest_1.it)("detects HTML content when passed as Buffer", async () => {
            const buf = Buffer.from("<html><body><h1>Test</h1></body></html>");
            const result = await (0, router_js_1.route)(buf);
            (0, vitest_1.expect)(result.sourceFormat).toBe("html");
            (0, vitest_1.expect)(result.content).toContain("# Test");
        });
    });
});
//# sourceMappingURL=router.test.js.map