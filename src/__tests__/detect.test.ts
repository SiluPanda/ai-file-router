import { describe, it, expect } from "vitest";
import { detectFormat } from "../detect.js";

describe("detectFormat", () => {
  describe("explicit format override", () => {
    it("returns explicit format with confidence 1.0", () => {
      const result = detectFormat({ format: "pdf" });
      expect(result.format).toBe("pdf");
      expect(result.confidence).toBe(1.0);
      expect(result.method).toBe("explicit");
    });

    it("uses explicit format even when content and extension disagree", () => {
      const result = detectFormat({
        content: Buffer.from("hello world"),
        filePath: "test.csv",
        format: "json",
      });
      expect(result.format).toBe("json");
    });
  });

  describe("magic bytes detection", () => {
    it("detects PDF from magic bytes", () => {
      const buf = Buffer.from("%PDF-1.7 some content here");
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("pdf");
      expect(result.confidence).toBe(1.0);
      expect(result.method).toBe("magic-bytes");
      expect(result.mimeType).toBe("application/pdf");
    });

    it("detects PNG from magic bytes", () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("image");
      expect(result.subtype).toBe("png");
      expect(result.mimeType).toBe("image/png");
    });

    it("detects JPEG from magic bytes", () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("image");
      expect(result.subtype).toBe("jpeg");
    });

    it("detects GIF from magic bytes", () => {
      const buf = Buffer.from("GIF89a" + "\x00".repeat(10));
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("image");
      expect(result.subtype).toBe("gif");
    });

    it("detects BMP from magic bytes", () => {
      const buf = Buffer.from([0x42, 0x4d, 0x00, 0x00, 0x00, 0x00]);
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("image");
      expect(result.subtype).toBe("bmp");
    });

    it("detects TIFF (little-endian) from magic bytes", () => {
      const buf = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x00, 0x00]);
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("image");
      expect(result.subtype).toBe("tiff");
    });

    it("detects TIFF (big-endian) from magic bytes", () => {
      const buf = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00]);
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("image");
      expect(result.subtype).toBe("tiff");
    });

    it("detects WEBP from magic bytes", () => {
      const buf = Buffer.alloc(16);
      buf.write("RIFF", 0);
      buf.writeUInt32LE(1000, 4);
      buf.write("WEBP", 8);
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("image");
      expect(result.subtype).toBe("webp");
      expect(result.mimeType).toBe("image/webp");
    });

    it("detects RTF from magic bytes", () => {
      const buf = Buffer.from("{\\rtf1\\ansi some rtf content}");
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("rtf");
      expect(result.confidence).toBe(1.0);
    });

    it("detects ZIP from magic bytes", () => {
      const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      const result = detectFormat({ content: buf });
      // Without extension, ZIP stays as zip
      expect(result.format).toBe("zip");
      expect(result.confidence).toBe(0.9);
    });

    it("disambiguates ZIP as DOCX with .docx extension", () => {
      const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      const result = detectFormat({ content: buf, filePath: "document.docx" });
      expect(result.format).toBe("docx");
      expect(result.confidence).toBe(0.9);
    });

    it("disambiguates ZIP as PPTX with .pptx extension", () => {
      const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      const result = detectFormat({ content: buf, filePath: "slides.pptx" });
      expect(result.format).toBe("pptx");
    });

    it("disambiguates ZIP as XLSX with .xlsx extension", () => {
      const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      const result = detectFormat({ content: buf, filePath: "data.xlsx" });
      expect(result.format).toBe("xlsx");
    });

    it("returns gzip for gzip magic bytes", () => {
      const buf = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00]);
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("gzip");
    });
  });

  describe("MIME type detection", () => {
    it("detects format from MIME type", () => {
      const result = detectFormat({ mimeType: "application/pdf" });
      expect(result.format).toBe("pdf");
      expect(result.confidence).toBe(0.8);
      expect(result.method).toBe("mime-type");
    });

    it("detects HTML from MIME type", () => {
      const result = detectFormat({ mimeType: "text/html" });
      expect(result.format).toBe("html");
    });

    it("detects JSON from MIME type", () => {
      const result = detectFormat({ mimeType: "application/json" });
      expect(result.format).toBe("json");
    });

    it("detects CSV from MIME type", () => {
      const result = detectFormat({ mimeType: "text/csv" });
      expect(result.format).toBe("csv");
    });

    it("detects YAML from MIME type", () => {
      const result = detectFormat({ mimeType: "application/x-yaml" });
      expect(result.format).toBe("yaml");
    });

    it("detects image/png from MIME type", () => {
      const result = detectFormat({ mimeType: "image/png" });
      expect(result.format).toBe("image");
      expect(result.subtype).toBe("png");
    });

    it("detects image/svg+xml from MIME type", () => {
      const result = detectFormat({ mimeType: "image/svg+xml" });
      expect(result.format).toBe("image");
      expect(result.subtype).toBe("svg");
    });

    it("ignores application/octet-stream MIME type", () => {
      const result = detectFormat({ mimeType: "application/octet-stream", filePath: "test.json" });
      expect(result.format).toBe("json");
      expect(result.method).toBe("extension");
    });

    it("magic bytes take priority over MIME type", () => {
      const buf = Buffer.from("%PDF-1.7 content");
      const result = detectFormat({ content: buf, mimeType: "text/plain" });
      expect(result.format).toBe("pdf");
      expect(result.method).toBe("magic-bytes");
    });
  });

  describe("extension-based detection", () => {
    it("detects PDF from extension", () => {
      const result = detectFormat({ filePath: "document.pdf" });
      expect(result.format).toBe("pdf");
      expect(result.confidence).toBe(0.6);
      expect(result.method).toBe("extension");
    });

    it("detects DOCX from extension", () => {
      const result = detectFormat({ filePath: "report.docx" });
      expect(result.format).toBe("docx");
    });

    it("detects CSV from extension", () => {
      const result = detectFormat({ filePath: "data.csv" });
      expect(result.format).toBe("csv");
    });

    it("detects TSV from extension", () => {
      const result = detectFormat({ filePath: "data.tsv" });
      expect(result.format).toBe("tsv");
    });

    it("detects HTML from .html extension", () => {
      const result = detectFormat({ filePath: "page.html" });
      expect(result.format).toBe("html");
    });

    it("detects HTML from .htm extension", () => {
      const result = detectFormat({ filePath: "page.htm" });
      expect(result.format).toBe("html");
    });

    it("detects Markdown from .md extension", () => {
      const result = detectFormat({ filePath: "README.md" });
      expect(result.format).toBe("markdown");
    });

    it("detects Markdown from .markdown extension", () => {
      const result = detectFormat({ filePath: "notes.markdown" });
      expect(result.format).toBe("markdown");
    });

    it("detects JSON from extension", () => {
      const result = detectFormat({ filePath: "config.json" });
      expect(result.format).toBe("json");
    });

    it("detects YAML from .yaml extension", () => {
      const result = detectFormat({ filePath: "config.yaml" });
      expect(result.format).toBe("yaml");
    });

    it("detects YAML from .yml extension", () => {
      const result = detectFormat({ filePath: "config.yml" });
      expect(result.format).toBe("yaml");
    });

    it("detects TOML from extension", () => {
      const result = detectFormat({ filePath: "config.toml" });
      expect(result.format).toBe("toml");
    });

    it("detects plain text from .txt extension", () => {
      const result = detectFormat({ filePath: "notes.txt" });
      expect(result.format).toBe("text");
    });

    it("detects plain text from .log extension", () => {
      const result = detectFormat({ filePath: "app.log" });
      expect(result.format).toBe("text");
    });

    it("detects RTF from extension", () => {
      const result = detectFormat({ filePath: "document.rtf" });
      expect(result.format).toBe("rtf");
    });

    it("detects XML from extension", () => {
      const result = detectFormat({ filePath: "data.xml" });
      expect(result.format).toBe("xml");
    });

    it("detects RST from extension", () => {
      const result = detectFormat({ filePath: "docs.rst" });
      expect(result.format).toBe("rst");
    });

    it("detects legacy doc format", () => {
      const result = detectFormat({ filePath: "old.doc" });
      expect(result.format).toBe("doc");
    });

    it("detects legacy xls format", () => {
      const result = detectFormat({ filePath: "old.xls" });
      expect(result.format).toBe("xls");
    });

    it("detects legacy ppt format", () => {
      const result = detectFormat({ filePath: "old.ppt" });
      expect(result.format).toBe("ppt");
    });
  });

  describe("code file detection", () => {
    const codeTests: Array<{ ext: string; lang: string }> = [
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
      it(`detects ${ext} as code (${lang})`, () => {
        const result = detectFormat({ filePath: `test${ext}` });
        expect(result.format).toBe("code");
        expect(result.language).toBe(lang);
      });
    }

    it("detects Dockerfile by filename", () => {
      const result = detectFormat({ filePath: "Dockerfile" });
      expect(result.format).toBe("code");
      expect(result.language).toBe("dockerfile");
    });

    it("detects Makefile by filename", () => {
      const result = detectFormat({ filePath: "Makefile" });
      expect(result.format).toBe("code");
      expect(result.language).toBe("makefile");
    });
  });

  describe("image format detection", () => {
    const imageTests: Array<{ ext: string; subtype: string }> = [
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
      it(`detects ${ext} as image (${subtype})`, () => {
        const result = detectFormat({ filePath: `image${ext}` });
        expect(result.format).toBe("image");
        expect(result.subtype).toBe(subtype);
      });
    }
  });

  describe("content heuristic detection", () => {
    it("detects JSON from content", () => {
      const result = detectFormat({ content: '{"key": "value"}' });
      expect(result.format).toBe("json");
      expect(result.confidence).toBe(0.5);
      expect(result.method).toBe("content-heuristic");
    });

    it("detects JSON array from content", () => {
      const result = detectFormat({ content: '[1, 2, 3]' });
      expect(result.format).toBe("json");
    });

    it("detects HTML from content", () => {
      const result = detectFormat({ content: "<html><body>Hello</body></html>" });
      expect(result.format).toBe("html");
      expect(result.method).toBe("content-heuristic");
    });

    it("detects HTML from DOCTYPE", () => {
      const result = detectFormat({ content: "<!doctype html><html></html>" });
      expect(result.format).toBe("html");
    });

    it("detects XML from content", () => {
      const result = detectFormat({ content: "<?xml version='1.0'?><root></root>" });
      expect(result.format).toBe("xml");
    });

    it("detects YAML from --- delimiter", () => {
      const result = detectFormat({ content: "---\nkey: value\nother: 42\n" });
      expect(result.format).toBe("yaml");
    });

    it("detects Markdown from # header", () => {
      const result = detectFormat({ content: "# My Document\n\nSome content here." });
      expect(result.format).toBe("markdown");
    });

    it("falls back to text for plain text content", () => {
      const result = detectFormat({ content: "Just some plain text without any markers." });
      expect(result.format).toBe("text");
      expect(result.confidence).toBe(0.3);
    });

    it("returns unknown for binary content without magic bytes", () => {
      const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
      const result = detectFormat({ content: buf });
      expect(result.format).toBe("unknown");
    });
  });

  describe("fileName hint", () => {
    it("uses fileName for extension detection when no filePath", () => {
      const result = detectFormat({ content: "some content", fileName: "data.csv" });
      expect(result.format).toBe("csv");
    });
  });

  describe("detection priority", () => {
    it("magic bytes win over MIME type", () => {
      const buf = Buffer.from("%PDF-1.4");
      const result = detectFormat({ content: buf, mimeType: "text/plain" });
      expect(result.format).toBe("pdf");
    });

    it("magic bytes win over extension", () => {
      const buf = Buffer.from("%PDF-1.4");
      const result = detectFormat({ content: buf, filePath: "file.txt" });
      expect(result.format).toBe("pdf");
    });

    it("MIME type wins over extension", () => {
      const result = detectFormat({ mimeType: "application/json", filePath: "file.txt" });
      expect(result.format).toBe("json");
    });

    it("extension used when no other signal", () => {
      const result = detectFormat({ filePath: "file.py" });
      expect(result.format).toBe("code");
      expect(result.language).toBe("python");
    });
  });
});
