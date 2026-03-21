import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  route,
  routeBatch,
  detectFormat,
  registerParser,
  getRegistry,
  ParserRegistry,
} from "../index.js";
import type {
  RouteResult,
  RouteOptions,
  FormatInfo,
  Parser,
  ParserInput,
  ParserOutput,
  BatchRouteResult,
} from "../index.js";

function createTempFile(name: string, content: string | Buffer): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-file-router-integ-"));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function cleanup(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
    fs.rmdirSync(path.dirname(filePath));
  } catch {
    // ignore
  }
}

describe("Integration Tests", () => {
  describe("exports", () => {
    it("exports route function", () => {
      expect(typeof route).toBe("function");
    });

    it("exports routeBatch function", () => {
      expect(typeof routeBatch).toBe("function");
    });

    it("exports detectFormat function", () => {
      expect(typeof detectFormat).toBe("function");
    });

    it("exports registerParser function", () => {
      expect(typeof registerParser).toBe("function");
    });

    it("exports getRegistry function", () => {
      expect(typeof getRegistry).toBe("function");
    });

    it("exports ParserRegistry class", () => {
      expect(typeof ParserRegistry).toBe("function");
      const registry = new ParserRegistry();
      expect(registry.getSupportedFormats().length).toBeGreaterThan(0);
    });
  });

  describe("end-to-end: detect then route", () => {
    it("detects and routes a JSON Buffer", async () => {
      const content = '{"users": [{"name": "Alice"}, {"name": "Bob"}]}';
      const buf = Buffer.from(content);

      // Step 1: detect
      const formatInfo = detectFormat({ content: buf });
      expect(formatInfo.format).toBe("json");

      // Step 2: route
      const result = await route(buf);
      expect(result.sourceFormat).toBe("json");
      expect(result.content).toContain("```json");
      expect(result.content).toContain("Alice");
    });

    it("detects and routes a CSV string with MIME type hint", async () => {
      const csv = "id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com";
      const buf = Buffer.from(csv);

      const result = await route(buf, { mimeType: "text/csv" });
      expect(result.sourceFormat).toBe("csv");
      expect(result.format).toBe("markdown");
      expect(result.content).toContain("| id | name | email |");
      expect(result.content).toContain("| 1 | Alice | alice@example.com |");
    });
  });

  describe("end-to-end: file types", () => {
    it("processes a complete TypeScript file", async () => {
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
        const result = await route(fp);
        expect(result.sourceFormat).toBe("code");
        expect(result.format).toBe("markdown");
        expect(result.content).toContain("```typescript");
        expect(result.content).toContain("interface Config");
        expect(result.content).toContain("loadConfig");
      } finally {
        cleanup(fp);
      }
    });

    it("processes a complete HTML page", async () => {
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
        const result = await route(fp);
        expect(result.sourceFormat).toBe("html");
        expect(result.format).toBe("markdown");
        expect(result.content).toContain("# Welcome");
        expect(result.content).toContain("**test**");
        expect(result.content).toContain("[link](/about)");
        expect(result.content).toContain("- Item one");
        expect(result.content).not.toContain("console.log");
      } finally {
        cleanup(fp);
      }
    });

    it("processes a CSV with special characters", async () => {
      const csv = `Name,Description,Price
"Widget A","A great ""widget"" for home use",19.99
"Widget B","Includes comma, and more",29.99
"Widget C",Simple,9.99`;

      const fp = createTempFile("products.csv", csv);
      try {
        const result = await route(fp);
        expect(result.sourceFormat).toBe("csv");
        expect(result.content).toContain("| Name | Description | Price |");
        expect(result.content).toContain('A great "widget" for home use');
        expect(result.content).toContain("Includes comma, and more");
      } finally {
        cleanup(fp);
      }
    });

    it("processes YAML config", async () => {
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
        const result = await route(fp);
        expect(result.sourceFormat).toBe("yaml");
        expect(result.content).toContain("```yaml");
        expect(result.content).toContain("port: 3000");
        expect(result.content).toContain("pool_size: 10");
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("end-to-end: batch processing", () => {
    it("batch processes mixed file types", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-file-router-batch-integ-"));
      try {
        const f1 = path.join(dir, "readme.md");
        const f2 = path.join(dir, "data.json");
        const f3 = path.join(dir, "script.py");

        fs.writeFileSync(f1, "# README\n\nProject documentation.");
        fs.writeFileSync(f2, '{"version": "1.0.0"}');
        fs.writeFileSync(f3, 'def hello():\n    print("hello")');

        const results = await routeBatch([f1, f2, f3]);
        expect(results).toHaveLength(3);

        for (const r of results) {
          expect(r.result).toBeDefined();
          expect(r.result!.content.length).toBeGreaterThan(0);
          expect(r.result!.durationMs).toBeGreaterThanOrEqual(0);
        }

        const mdResult = results.find((r) => r.source.endsWith("readme.md"));
        expect(mdResult!.result!.sourceFormat).toBe("markdown");

        const jsonResult = results.find((r) => r.source.endsWith("data.json"));
        expect(jsonResult!.result!.sourceFormat).toBe("json");

        const pyResult = results.find((r) => r.source.endsWith("script.py"));
        expect(pyResult!.result!.sourceFormat).toBe("code");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("end-to-end: custom parser", () => {
    it("registers and uses a custom format parser", async () => {
      const customParser: Parser = {
        name: "ini-parser",
        formats: ["ini"],
        canParse: (input: ParserInput) => input.formatInfo.format === "ini",
        parse: async (input: ParserInput): Promise<ParserOutput> => {
          const content =
            typeof input.content === "string"
              ? input.content
              : input.content.toString("utf-8");

          // Simple INI to markdown conversion
          const lines = content.split("\n");
          const mdLines: string[] = [];

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
              mdLines.push(`## ${trimmed.slice(1, -1)}`);
            } else if (trimmed.includes("=")) {
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

      registerParser(customParser);

      const ini = "[database]\nhost=localhost\nport=5432\n[server]\nport=3000";
      const result = await route(ini, { format: "ini" });
      expect(result.sourceFormat).toBe("ini");
      expect(result.format).toBe("markdown");
      expect(result.content).toContain("## database");
      expect(result.content).toContain("**host**: localhost");
      expect(result.content).toContain("## server");
    });
  });

  describe("end-to-end: binary format handling", () => {
    it("PDF magic bytes result in helpful message", async () => {
      const pdfHeader = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj");
      const result = await route(pdfHeader, { fileName: "document.pdf" });
      expect(result.sourceFormat).toBe("pdf");
      expect(result.content).toContain("PDF file detected");
      expect(result.content).toContain("docling-node-ts");
    });

    it("PNG magic bytes result in image description", async () => {
      const pngBuf = Buffer.alloc(64);
      pngBuf[0] = 0x89;
      pngBuf[1] = 0x50;
      pngBuf[2] = 0x4e;
      pngBuf[3] = 0x47;
      pngBuf[4] = 0x0d;
      pngBuf[5] = 0x0a;
      pngBuf[6] = 0x1a;
      pngBuf[7] = 0x0a;

      const result = await route(pngBuf);
      expect(result.sourceFormat).toBe("image");
      expect(result.content).toContain("PNG image detected");
    });
  });

  describe("RouteResult contract", () => {
    it("is JSON serializable", async () => {
      const result = await route("test content", { format: "text" });
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);
      expect(parsed.content).toBe("test content");
      expect(parsed.format).toBe("text");
      expect(parsed.sourceFormat).toBe("text");
      expect(typeof parsed.durationMs).toBe("number");
      expect(Array.isArray(parsed.warnings)).toBe(true);
    });

    it("has all required fields", async () => {
      const result = await route("hello", { format: "text" });
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("format");
      expect(result).toHaveProperty("sourceFormat");
      expect(result).toHaveProperty("metadata");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("durationMs");
      expect(result.metadata).toHaveProperty("wordCount");
    });
  });
});
