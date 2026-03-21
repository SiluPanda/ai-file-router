import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { route, registerParser, getRegistry } from "../router.js";
import { Parser, ParserInput, ParserOutput } from "../types.js";

function createTempFile(name: string, content: string | Buffer): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-file-router-test-"));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function cleanup(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
    fs.rmdirSync(path.dirname(filePath));
  } catch {
    // ignore cleanup errors
  }
}

describe("route", () => {
  describe("routing text files", () => {
    it("routes a text file from path", async () => {
      const fp = createTempFile("test.txt", "Hello, world!");
      try {
        const result = await route(fp);
        expect(result.content).toBe("Hello, world!");
        expect(result.format).toBe("text");
        expect(result.sourceFormat).toBe("text");
        expect(result.metadata.filePath).toBe(fp);
        expect(result.metadata.fileName).toBe("test.txt");
        expect(result.metadata.fileSize).toBeDefined();
        expect(result.metadata.wordCount).toBe(2);
        expect(result.warnings).toHaveLength(0);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      } finally {
        cleanup(fp);
      }
    });

    it("routes text content as inline string (with format hint)", async () => {
      const result = await route("Hello inline text", { format: "text" });
      expect(result.content).toBe("Hello inline text");
      expect(result.format).toBe("text");
    });

    it("routes a Buffer with fileName hint", async () => {
      const buf = Buffer.from("Buffer content");
      const result = await route(buf, { fileName: "test.txt" });
      expect(result.content).toBe("Buffer content");
      expect(result.sourceFormat).toBe("text");
    });
  });

  describe("routing code files", () => {
    it("routes a TypeScript file", async () => {
      const fp = createTempFile("index.ts", 'const x: number = 42;\nconsole.log(x);');
      try {
        const result = await route(fp);
        expect(result.format).toBe("markdown");
        expect(result.sourceFormat).toBe("code");
        expect(result.content).toContain("```typescript");
        expect(result.content).toContain("const x: number = 42;");
        expect(result.content).toContain("```");
      } finally {
        cleanup(fp);
      }
    });

    it("routes a Python file", async () => {
      const fp = createTempFile("script.py", 'print("hello")');
      try {
        const result = await route(fp);
        expect(result.content).toContain("```python");
        expect(result.content).toContain('print("hello")');
      } finally {
        cleanup(fp);
      }
    });

    it("routes a JavaScript file", async () => {
      const fp = createTempFile("app.js", "function greet() { return 'hi'; }");
      try {
        const result = await route(fp);
        expect(result.content).toContain("```javascript");
      } finally {
        cleanup(fp);
      }
    });

    it("includes header when codeOptions.includeHeader is set", async () => {
      const fp = createTempFile("util.ts", "export const x = 1;");
      try {
        const result = await route(fp, { codeOptions: { includeHeader: true } });
        expect(result.content).toContain("## File:");
        expect(result.content).toContain("typescript");
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("routing markdown files", () => {
    it("routes a markdown file", async () => {
      const fp = createTempFile("readme.md", "# Title\n\nSome content.");
      try {
        const result = await route(fp);
        expect(result.format).toBe("markdown");
        expect(result.sourceFormat).toBe("markdown");
        expect(result.content).toContain("# Title");
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("routing HTML files", () => {
    it("routes an HTML file", async () => {
      const fp = createTempFile("page.html", "<h1>Hello</h1><p>World</p>");
      try {
        const result = await route(fp);
        expect(result.format).toBe("markdown");
        expect(result.sourceFormat).toBe("html");
        expect(result.content).toContain("# Hello");
        expect(result.content).toContain("World");
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("routing JSON files", () => {
    it("routes a JSON file", async () => {
      const fp = createTempFile("config.json", '{"key": "value"}');
      try {
        const result = await route(fp);
        expect(result.format).toBe("markdown");
        expect(result.sourceFormat).toBe("json");
        expect(result.content).toContain("```json");
        expect(result.content).toContain('"key": "value"');
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("routing CSV files", () => {
    it("routes a CSV file", async () => {
      const fp = createTempFile("data.csv", "Name,Age\nAlice,30\nBob,25");
      try {
        const result = await route(fp);
        expect(result.format).toBe("markdown");
        expect(result.sourceFormat).toBe("csv");
        expect(result.content).toContain("| Name | Age |");
        expect(result.content).toContain("| Alice | 30 |");
      } finally {
        cleanup(fp);
      }
    });

    it("routes a TSV file", async () => {
      const fp = createTempFile("data.tsv", "Name\tAge\nAlice\t30");
      try {
        const result = await route(fp);
        expect(result.sourceFormat).toBe("tsv");
        expect(result.content).toContain("| Name | Age |");
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("routing YAML files", () => {
    it("routes a YAML file", async () => {
      const fp = createTempFile("config.yaml", "name: test\nversion: 1.0");
      try {
        const result = await route(fp);
        expect(result.format).toBe("markdown");
        expect(result.sourceFormat).toBe("yaml");
        expect(result.content).toContain("```yaml");
        expect(result.content).toContain("name: test");
      } finally {
        cleanup(fp);
      }
    });

    it("routes a TOML file", async () => {
      const fp = createTempFile("config.toml", '[package]\nname = "test"');
      try {
        const result = await route(fp);
        expect(result.sourceFormat).toBe("toml");
        expect(result.content).toContain("```toml");
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("routing binary files", () => {
    it("routes a PDF file (returns helpful message)", async () => {
      const buf = Buffer.from("%PDF-1.7 fake pdf content here");
      const fp = createTempFile("document.pdf", buf);
      try {
        const result = await route(fp);
        expect(result.sourceFormat).toBe("pdf");
        expect(result.content).toContain("PDF file detected");
        expect(result.content).toContain("requires external parser");
      } finally {
        cleanup(fp);
      }
    });

    it("routes a DOCX file (ZIP magic bytes)", async () => {
      const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
      const fp = createTempFile("report.docx", buf);
      try {
        const result = await route(fp);
        expect(result.sourceFormat).toBe("docx");
        expect(result.content).toContain("DOCX");
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("routing image files", () => {
    it("routes a PNG image", async () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const fp = createTempFile("image.png", buf);
      try {
        const result = await route(fp);
        expect(result.sourceFormat).toBe("image");
        expect(result.content).toContain("PNG image detected");
      } finally {
        cleanup(fp);
      }
    });

    it("routes an SVG image as text", async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      const fp = createTempFile("icon.svg", svg);
      try {
        const result = await route(fp);
        expect(result.sourceFormat).toBe("image");
        expect(result.content).toContain("```svg");
        expect(result.content).toContain("<rect/>");
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("format override", () => {
    it("uses format override to force JSON parsing", async () => {
      const content = '{"name": "test"}';
      const result = await route(content, { format: "json" });
      expect(result.sourceFormat).toBe("json");
      expect(result.content).toContain("```json");
    });

    it("uses MIME type hint", async () => {
      const buf = Buffer.from("name,age\nAlice,30");
      const result = await route(buf, { mimeType: "text/csv", fileName: "data" });
      expect(result.sourceFormat).toBe("csv");
    });
  });

  describe("maxSize truncation", () => {
    it("truncates output when maxSize is set", async () => {
      const longContent = "x".repeat(1000);
      const result = await route(longContent, { format: "text", maxSize: 100 });
      expect(result.content.length).toBe(100);
      expect(result.warnings).toContain("Output truncated to 100 characters");
    });

    it("does not truncate when content is within maxSize", async () => {
      const result = await route("short", { format: "text", maxSize: 1000 });
      expect(result.content).toBe("short");
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("returns error result for non-existent file", async () => {
      const result = await route("/tmp/this-file-definitely-does-not-exist-12345.txt");
      expect(result.content).toBe("");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("Failed to read file"))).toBe(true);
    });

    it("returns error for unknown format Buffer with no hints", async () => {
      const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const result = await route(buf);
      expect(result.content).toBe("");
      expect(result.warnings.some((w) => w.includes("Unable to detect"))).toBe(true);
    });
  });

  describe("metadata", () => {
    it("includes word count in metadata", async () => {
      const result = await route("one two three four five", { format: "text" });
      expect(result.metadata.wordCount).toBe(5);
    });

    it("includes duration in result", async () => {
      const result = await route("test", { format: "text" });
      expect(typeof result.durationMs).toBe("number");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("includes mimeType when detected", async () => {
      const fp = createTempFile("test.json", "{}");
      try {
        const result = await route(fp);
        expect(result.mimeType).toBe("application/json");
      } finally {
        cleanup(fp);
      }
    });
  });

  describe("custom parser registration", () => {
    it("uses a registered custom parser", async () => {
      const customParser: Parser = {
        name: "my-custom",
        formats: ["custom_test_format"],
        canParse: (input: ParserInput) => input.formatInfo.format === "custom_test_format",
        parse: async (): Promise<ParserOutput> => ({
          content: "custom parser output!",
          format: "text",
        }),
      };

      registerParser(customParser);
      const result = await route("anything", { format: "custom_test_format" });
      expect(result.content).toBe("custom parser output!");
      expect(result.sourceFormat).toBe("custom_test_format");
    });
  });

  describe("content-based detection for inline strings", () => {
    it("detects JSON content when passed as Buffer", async () => {
      const buf = Buffer.from('{"hello": "world"}');
      const result = await route(buf);
      expect(result.sourceFormat).toBe("json");
      expect(result.content).toContain("```json");
    });

    it("detects HTML content when passed as Buffer", async () => {
      const buf = Buffer.from("<html><body><h1>Test</h1></body></html>");
      const result = await route(buf);
      expect(result.sourceFormat).toBe("html");
      expect(result.content).toContain("# Test");
    });
  });
});
