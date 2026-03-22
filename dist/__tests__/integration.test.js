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
const index_js_1 = require("../index.js");
function createTempFile(name, content) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-file-router-integ-"));
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
        // ignore
    }
}
(0, vitest_1.describe)("Integration Tests", () => {
    (0, vitest_1.describe)("exports", () => {
        (0, vitest_1.it)("exports route function", () => {
            (0, vitest_1.expect)(typeof index_js_1.route).toBe("function");
        });
        (0, vitest_1.it)("exports routeBatch function", () => {
            (0, vitest_1.expect)(typeof index_js_1.routeBatch).toBe("function");
        });
        (0, vitest_1.it)("exports detectFormat function", () => {
            (0, vitest_1.expect)(typeof index_js_1.detectFormat).toBe("function");
        });
        (0, vitest_1.it)("exports registerParser function", () => {
            (0, vitest_1.expect)(typeof index_js_1.registerParser).toBe("function");
        });
        (0, vitest_1.it)("exports getRegistry function", () => {
            (0, vitest_1.expect)(typeof index_js_1.getRegistry).toBe("function");
        });
        (0, vitest_1.it)("exports ParserRegistry class", () => {
            (0, vitest_1.expect)(typeof index_js_1.ParserRegistry).toBe("function");
            const registry = new index_js_1.ParserRegistry();
            (0, vitest_1.expect)(registry.getSupportedFormats().length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)("end-to-end: detect then route", () => {
        (0, vitest_1.it)("detects and routes a JSON Buffer", async () => {
            const content = '{"users": [{"name": "Alice"}, {"name": "Bob"}]}';
            const buf = Buffer.from(content);
            // Step 1: detect
            const formatInfo = (0, index_js_1.detectFormat)({ content: buf });
            (0, vitest_1.expect)(formatInfo.format).toBe("json");
            // Step 2: route
            const result = await (0, index_js_1.route)(buf);
            (0, vitest_1.expect)(result.sourceFormat).toBe("json");
            (0, vitest_1.expect)(result.content).toContain("```json");
            (0, vitest_1.expect)(result.content).toContain("Alice");
        });
        (0, vitest_1.it)("detects and routes a CSV string with MIME type hint", async () => {
            const csv = "id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com";
            const buf = Buffer.from(csv);
            const result = await (0, index_js_1.route)(buf, { mimeType: "text/csv" });
            (0, vitest_1.expect)(result.sourceFormat).toBe("csv");
            (0, vitest_1.expect)(result.format).toBe("markdown");
            (0, vitest_1.expect)(result.content).toContain("| id | name | email |");
            (0, vitest_1.expect)(result.content).toContain("| 1 | Alice | alice@example.com |");
        });
    });
    (0, vitest_1.describe)("end-to-end: file types", () => {
        (0, vitest_1.it)("processes a complete TypeScript file", async () => {
            const code = `
import { readFileSync } from 'fs';

interface Config {
  port: number;
  host: string;
}

export function loadConfig(path: string): Config {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw);
}
`.trim();
            const fp = createTempFile("config-loader.ts", code);
            try {
                const result = await (0, index_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("code");
                (0, vitest_1.expect)(result.format).toBe("markdown");
                (0, vitest_1.expect)(result.content).toContain("```typescript");
                (0, vitest_1.expect)(result.content).toContain("interface Config");
                (0, vitest_1.expect)(result.content).toContain("loadConfig");
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("processes a complete HTML page", async () => {
            const html = `
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <h1>Welcome</h1>
  <p>This is a <strong>test</strong> page with a <a href="/about">link</a>.</p>
  <ul>
    <li>Item one</li>
    <li>Item two</li>
  </ul>
  <script>console.log('hidden');</script>
</body>
</html>`.trim();
            const fp = createTempFile("page.html", html);
            try {
                const result = await (0, index_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("html");
                (0, vitest_1.expect)(result.format).toBe("markdown");
                (0, vitest_1.expect)(result.content).toContain("# Welcome");
                (0, vitest_1.expect)(result.content).toContain("**test**");
                (0, vitest_1.expect)(result.content).toContain("[link](/about)");
                (0, vitest_1.expect)(result.content).toContain("- Item one");
                (0, vitest_1.expect)(result.content).not.toContain("console.log");
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("processes a CSV with special characters", async () => {
            const csv = `Name,Description,Price
"Widget A","A great ""widget"" for home use",19.99
"Widget B","Includes comma, and more",29.99
"Widget C",Simple,9.99`;
            const fp = createTempFile("products.csv", csv);
            try {
                const result = await (0, index_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("csv");
                (0, vitest_1.expect)(result.content).toContain("| Name | Description | Price |");
                (0, vitest_1.expect)(result.content).toContain('A great "widget" for home use');
                (0, vitest_1.expect)(result.content).toContain("Includes comma, and more");
            }
            finally {
                cleanup(fp);
            }
        });
        (0, vitest_1.it)("processes YAML config", async () => {
            const yaml = `
server:
  port: 3000
  host: localhost
database:
  url: postgres://localhost:5432/mydb
  pool_size: 10
`.trim();
            const fp = createTempFile("config.yml", yaml);
            try {
                const result = await (0, index_js_1.route)(fp);
                (0, vitest_1.expect)(result.sourceFormat).toBe("yaml");
                (0, vitest_1.expect)(result.content).toContain("```yaml");
                (0, vitest_1.expect)(result.content).toContain("port: 3000");
                (0, vitest_1.expect)(result.content).toContain("pool_size: 10");
            }
            finally {
                cleanup(fp);
            }
        });
    });
    (0, vitest_1.describe)("end-to-end: batch processing", () => {
        (0, vitest_1.it)("batch processes mixed file types", async () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-file-router-batch-integ-"));
            try {
                const f1 = path.join(dir, "readme.md");
                const f2 = path.join(dir, "data.json");
                const f3 = path.join(dir, "script.py");
                fs.writeFileSync(f1, "# README\n\nProject documentation.");
                fs.writeFileSync(f2, '{"version": "1.0.0"}');
                fs.writeFileSync(f3, 'def hello():\n    print("hello")');
                const results = await (0, index_js_1.routeBatch)([f1, f2, f3]);
                (0, vitest_1.expect)(results).toHaveLength(3);
                for (const r of results) {
                    (0, vitest_1.expect)(r.result).toBeDefined();
                    (0, vitest_1.expect)(r.result.content.length).toBeGreaterThan(0);
                    (0, vitest_1.expect)(r.result.durationMs).toBeGreaterThanOrEqual(0);
                }
                const mdResult = results.find((r) => r.source.endsWith("readme.md"));
                (0, vitest_1.expect)(mdResult.result.sourceFormat).toBe("markdown");
                const jsonResult = results.find((r) => r.source.endsWith("data.json"));
                (0, vitest_1.expect)(jsonResult.result.sourceFormat).toBe("json");
                const pyResult = results.find((r) => r.source.endsWith("script.py"));
                (0, vitest_1.expect)(pyResult.result.sourceFormat).toBe("code");
            }
            finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });
    });
    (0, vitest_1.describe)("end-to-end: custom parser", () => {
        (0, vitest_1.it)("registers and uses a custom format parser", async () => {
            const customParser = {
                name: "ini-parser",
                formats: ["ini"],
                canParse: (input) => input.formatInfo.format === "ini",
                parse: async (input) => {
                    const content = typeof input.content === "string"
                        ? input.content
                        : input.content.toString("utf-8");
                    // Simple INI to markdown conversion
                    const lines = content.split("\n");
                    const mdLines = [];
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                            mdLines.push(`## ${trimmed.slice(1, -1)}`);
                        }
                        else if (trimmed.includes("=")) {
                            const [key, ...valueParts] = trimmed.split("=");
                            mdLines.push(`- **${key.trim()}**: ${valueParts.join("=").trim()}`);
                        }
                    }
                    return {
                        content: mdLines.join("\n"),
                        format: "markdown",
                    };
                },
            };
            (0, index_js_1.registerParser)(customParser);
            const ini = "[database]\nhost=localhost\nport=5432\n[server]\nport=3000";
            const result = await (0, index_js_1.route)(ini, { format: "ini" });
            (0, vitest_1.expect)(result.sourceFormat).toBe("ini");
            (0, vitest_1.expect)(result.format).toBe("markdown");
            (0, vitest_1.expect)(result.content).toContain("## database");
            (0, vitest_1.expect)(result.content).toContain("**host**: localhost");
            (0, vitest_1.expect)(result.content).toContain("## server");
        });
    });
    (0, vitest_1.describe)("end-to-end: binary format handling", () => {
        (0, vitest_1.it)("PDF magic bytes result in helpful message", async () => {
            const pdfHeader = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj");
            const result = await (0, index_js_1.route)(pdfHeader, { fileName: "document.pdf" });
            (0, vitest_1.expect)(result.sourceFormat).toBe("pdf");
            (0, vitest_1.expect)(result.content).toContain("PDF file detected");
            (0, vitest_1.expect)(result.content).toContain("docling-node-ts");
        });
        (0, vitest_1.it)("PNG magic bytes result in image description", async () => {
            const pngBuf = Buffer.alloc(64);
            pngBuf[0] = 0x89;
            pngBuf[1] = 0x50;
            pngBuf[2] = 0x4e;
            pngBuf[3] = 0x47;
            pngBuf[4] = 0x0d;
            pngBuf[5] = 0x0a;
            pngBuf[6] = 0x1a;
            pngBuf[7] = 0x0a;
            const result = await (0, index_js_1.route)(pngBuf);
            (0, vitest_1.expect)(result.sourceFormat).toBe("image");
            (0, vitest_1.expect)(result.content).toContain("PNG image detected");
        });
    });
    (0, vitest_1.describe)("RouteResult contract", () => {
        (0, vitest_1.it)("is JSON serializable", async () => {
            const result = await (0, index_js_1.route)("test content", { format: "text" });
            const json = JSON.stringify(result);
            const parsed = JSON.parse(json);
            (0, vitest_1.expect)(parsed.content).toBe("test content");
            (0, vitest_1.expect)(parsed.format).toBe("text");
            (0, vitest_1.expect)(parsed.sourceFormat).toBe("text");
            (0, vitest_1.expect)(typeof parsed.durationMs).toBe("number");
            (0, vitest_1.expect)(Array.isArray(parsed.warnings)).toBe(true);
        });
        (0, vitest_1.it)("has all required fields", async () => {
            const result = await (0, index_js_1.route)("hello", { format: "text" });
            (0, vitest_1.expect)(result).toHaveProperty("content");
            (0, vitest_1.expect)(result).toHaveProperty("format");
            (0, vitest_1.expect)(result).toHaveProperty("sourceFormat");
            (0, vitest_1.expect)(result).toHaveProperty("metadata");
            (0, vitest_1.expect)(result).toHaveProperty("warnings");
            (0, vitest_1.expect)(result).toHaveProperty("durationMs");
            (0, vitest_1.expect)(result.metadata).toHaveProperty("wordCount");
        });
    });
});
//# sourceMappingURL=integration.test.js.map