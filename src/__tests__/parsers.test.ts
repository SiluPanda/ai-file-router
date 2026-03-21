import { describe, it, expect } from "vitest";
import { textParser, codeParser } from "../parsers/text.js";
import { markdownParser } from "../parsers/markdown.js";
import { htmlParser } from "../parsers/html.js";
import { jsonParser } from "../parsers/json.js";
import { csvParser } from "../parsers/csv.js";
import { yamlParser } from "../parsers/yaml.js";
import { binaryParser, imageParser } from "../parsers/binary.js";
import { ParserInput, FormatInfo } from "../types.js";

function makeInput(content: string, format: string, extra?: Partial<FormatInfo>): ParserInput {
  return {
    content,
    formatInfo: { format, confidence: 1.0, method: "explicit", ...extra },
  };
}

function makeBufInput(content: Buffer, format: string, extra?: Partial<FormatInfo>): ParserInput {
  return {
    content,
    formatInfo: { format, confidence: 1.0, method: "explicit", ...extra },
  };
}

describe("textParser", () => {
  it("passes through plain text", async () => {
    const result = await textParser.parse(makeInput("Hello world", "text"));
    expect(result.content).toBe("Hello world");
    expect(result.format).toBe("text");
  });

  it("normalizes CRLF line endings", async () => {
    const result = await textParser.parse(makeInput("line1\r\nline2\r\nline3", "text"));
    expect(result.content).toBe("line1\nline2\nline3");
  });

  it("normalizes CR line endings", async () => {
    const result = await textParser.parse(makeInput("line1\rline2", "text"));
    expect(result.content).toBe("line1\nline2");
  });

  it("trims trailing whitespace per line", async () => {
    const result = await textParser.parse(makeInput("line1   \nline2\t\t\nline3", "text"));
    expect(result.content).toBe("line1\nline2\nline3");
  });

  it("trims trailing whitespace at end", async () => {
    const result = await textParser.parse(makeInput("content\n\n\n", "text"));
    expect(result.content).toBe("content");
  });

  it("handles Buffer input", async () => {
    const result = await textParser.parse(makeBufInput(Buffer.from("buffer text"), "text"));
    expect(result.content).toBe("buffer text");
  });

  it("canParse returns true for text format", () => {
    expect(textParser.canParse(makeInput("", "text"))).toBe(true);
  });

  it("canParse returns false for other formats", () => {
    expect(textParser.canParse(makeInput("", "json"))).toBe(false);
  });
});

describe("codeParser", () => {
  it("wraps code in fenced code block with language", async () => {
    const input = makeInput("const x = 1;", "code", { language: "typescript" });
    const result = await codeParser.parse(input);
    expect(result.content).toBe("```typescript\nconst x = 1;\n```");
    expect(result.format).toBe("markdown");
  });

  it("wraps code without language tag when none provided", async () => {
    const input = makeInput("some code", "code");
    const result = await codeParser.parse(input);
    expect(result.content).toBe("```\nsome code\n```");
  });

  it("includes header when codeOptions.includeHeader is true", async () => {
    const input: ParserInput = {
      content: "print('hello')",
      formatInfo: { format: "code", confidence: 1.0, method: "explicit", language: "python" },
      fileName: "script.py",
    };
    const result = await codeParser.parse(input, { codeOptions: { includeHeader: true } });
    expect(result.content).toContain("## File: script.py (python)");
    expect(result.content).toContain("```python");
    expect(result.content).toContain("print('hello')");
  });

  it("normalizes line endings in code", async () => {
    const input = makeInput("line1\r\nline2", "code", { language: "javascript" });
    const result = await codeParser.parse(input);
    expect(result.content).toBe("```javascript\nline1\nline2\n```");
  });

  it("canParse returns true for code format", () => {
    expect(codeParser.canParse(makeInput("", "code"))).toBe(true);
  });

  it("canParse returns false for non-code", () => {
    expect(codeParser.canParse(makeInput("", "text"))).toBe(false);
  });
});

describe("markdownParser", () => {
  it("passes through markdown", async () => {
    const md = "# Title\n\nParagraph here.\n\n## Section\n\nMore text.";
    const result = await markdownParser.parse(makeInput(md, "markdown"));
    expect(result.content).toBe(md);
    expect(result.format).toBe("markdown");
  });

  it("normalizes line endings", async () => {
    const result = await markdownParser.parse(makeInput("# Title\r\n\r\nContent", "markdown"));
    expect(result.content).toBe("# Title\n\nContent");
  });

  it("collapses excessive blank lines", async () => {
    const result = await markdownParser.parse(makeInput("# Title\n\n\n\n\nContent", "markdown"));
    expect(result.content).toBe("# Title\n\nContent");
  });

  it("strips markdown when outputFormat is text", async () => {
    const md = "# Title\n\n**Bold text** and *italic*.\n\n[Link](http://example.com)";
    const result = await markdownParser.parse(makeInput(md, "markdown"), { outputFormat: "text" });
    expect(result.format).toBe("text");
    expect(result.content).not.toContain("#");
    expect(result.content).not.toContain("**");
    expect(result.content).not.toContain("*");
    expect(result.content).toContain("Bold text");
    expect(result.content).toContain("Link");
  });

  it("canParse returns true for markdown", () => {
    expect(markdownParser.canParse(makeInput("", "markdown"))).toBe(true);
  });
});

describe("htmlParser", () => {
  it("converts simple HTML to markdown", async () => {
    const html = "<h1>Title</h1><p>Paragraph text.</p>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.format).toBe("markdown");
    expect(result.content).toContain("# Title");
    expect(result.content).toContain("Paragraph text.");
  });

  it("converts headings at all levels", async () => {
    const html = "<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).toContain("# H1");
    expect(result.content).toContain("## H2");
    expect(result.content).toContain("### H3");
    expect(result.content).toContain("#### H4");
    expect(result.content).toContain("##### H5");
    expect(result.content).toContain("###### H6");
  });

  it("converts bold and italic", async () => {
    const html = "<p><strong>bold</strong> and <em>italic</em></p>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).toContain("**bold**");
    expect(result.content).toContain("*italic*");
  });

  it("converts links", async () => {
    const html = '<p><a href="https://example.com">Click here</a></p>';
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).toContain("[Click here](https://example.com)");
  });

  it("converts unordered lists", async () => {
    const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).toContain("- Item 1");
    expect(result.content).toContain("- Item 2");
  });

  it("converts ordered lists", async () => {
    const html = "<ol><li>First</li><li>Second</li></ol>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).toContain("1. First");
    expect(result.content).toContain("2. Second");
  });

  it("converts tables to markdown", async () => {
    const html = "<table><tr><th>Name</th><th>Age</th></tr><tr><td>Alice</td><td>30</td></tr></table>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).toContain("| Name | Age |");
    expect(result.content).toContain("| --- | --- |");
    expect(result.content).toContain("| Alice | 30 |");
  });

  it("removes script tags", async () => {
    const html = "<p>Text</p><script>alert('xss')</script><p>More</p>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).not.toContain("alert");
    expect(result.content).not.toContain("script");
    expect(result.content).toContain("Text");
    expect(result.content).toContain("More");
  });

  it("removes style tags", async () => {
    const html = "<style>body { color: red; }</style><p>Content</p>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).not.toContain("color");
    expect(result.content).toContain("Content");
  });

  it("decodes HTML entities", async () => {
    const html = "<p>&amp; &lt; &gt; &quot; &#39;</p>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).toContain("& < > \" '");
  });

  it("converts blockquotes", async () => {
    const html = "<blockquote>Quoted text here</blockquote>";
    const result = await htmlParser.parse(makeInput(html, "html"));
    expect(result.content).toContain("> Quoted text here");
  });

  it("handles XML format by wrapping in code fence", async () => {
    const xml = '<?xml version="1.0"?>\n<root><item>value</item></root>';
    const result = await htmlParser.parse(makeInput(xml, "xml"));
    expect(result.format).toBe("markdown");
    expect(result.content).toContain("```xml");
    expect(result.content).toContain("<root>");
  });

  it("canParse returns true for html and xml", () => {
    expect(htmlParser.canParse(makeInput("", "html"))).toBe(true);
    expect(htmlParser.canParse(makeInput("", "xml"))).toBe(true);
    expect(htmlParser.canParse(makeInput("", "text"))).toBe(false);
  });
});

describe("jsonParser", () => {
  it("pretty-prints valid JSON in code fence", async () => {
    const json = '{"name":"Alice","age":30}';
    const result = await jsonParser.parse(makeInput(json, "json"));
    expect(result.format).toBe("markdown");
    expect(result.content).toContain("```json");
    expect(result.content).toContain('"name": "Alice"');
    expect(result.content).toContain('"age": 30');
  });

  it("handles JSON arrays", async () => {
    const json = "[1, 2, 3]";
    const result = await jsonParser.parse(makeInput(json, "json"));
    expect(result.content).toContain("```json");
    expect(result.content).toContain("1");
  });

  it("handles nested JSON", async () => {
    const json = '{"user":{"name":"Bob","scores":[1,2,3]}}';
    const result = await jsonParser.parse(makeInput(json, "json"));
    expect(result.content).toContain('"user"');
    expect(result.content).toContain('"name": "Bob"');
  });

  it("handles invalid JSON with warning", async () => {
    const result = await jsonParser.parse(makeInput("{invalid json}", "json"));
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThan(0);
    expect(result.content).toContain("```json");
    expect(result.content).toContain("{invalid json}");
  });

  it("summarizes large JSON", async () => {
    const largeObj: Record<string, string> = {};
    for (let i = 0; i < 500; i++) {
      largeObj[`key_${i}`] = "x".repeat(100);
    }
    const json = JSON.stringify(largeObj);
    const result = await jsonParser.parse(makeInput(json, "json"));
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes("truncated"))).toBe(true);
  });

  it("handles empty object", async () => {
    const result = await jsonParser.parse(makeInput("{}", "json"));
    expect(result.content).toContain("```json");
    expect(result.content).toContain("{}");
  });

  it("handles null value", async () => {
    const result = await jsonParser.parse(makeInput("null", "json"));
    expect(result.content).toContain("null");
  });

  it("handles Buffer input", async () => {
    const result = await jsonParser.parse(makeBufInput(Buffer.from('{"a":1}'), "json"));
    expect(result.content).toContain('"a": 1');
  });
});

describe("csvParser", () => {
  it("converts CSV to markdown table", async () => {
    const csv = "Name,Age,City\nAlice,30,NYC\nBob,25,LA";
    const result = await csvParser.parse(makeInput(csv, "csv"));
    expect(result.format).toBe("markdown");
    expect(result.content).toContain("| Name | Age | City |");
    expect(result.content).toContain("| --- | --- | --- |");
    expect(result.content).toContain("| Alice | 30 | NYC |");
    expect(result.content).toContain("| Bob | 25 | LA |");
  });

  it("handles quoted fields with commas", async () => {
    const csv = 'Name,Description\nAlice,"Has, commas"\nBob,Simple';
    const result = await csvParser.parse(makeInput(csv, "csv"));
    expect(result.content).toContain("| Alice | Has, commas |");
  });

  it("handles escaped quotes in fields", async () => {
    const csv = 'Name,Quote\nAlice,"She said ""hello"""\nBob,Normal';
    const result = await csvParser.parse(makeInput(csv, "csv"));
    expect(result.content).toContain('She said "hello"');
  });

  it("handles TSV format", async () => {
    const tsv = "Name\tAge\nAlice\t30\nBob\t25";
    const result = await csvParser.parse(makeInput(tsv, "tsv"));
    expect(result.format).toBe("markdown");
    expect(result.content).toContain("| Name | Age |");
    expect(result.content).toContain("| Alice | 30 |");
  });

  it("handles empty file", async () => {
    const result = await csvParser.parse(makeInput("", "csv"));
    expect(result.content).toBe("(empty file)");
    expect(result.format).toBe("text");
  });

  it("handles single row (header only)", async () => {
    const result = await csvParser.parse(makeInput("Name,Age", "csv"));
    expect(result.content).toContain("| Name | Age |");
    expect(result.content).toContain("| --- | --- |");
  });

  it("normalizes uneven columns", async () => {
    const csv = "A,B,C\n1,2\n3,4,5";
    const result = await csvParser.parse(makeInput(csv, "csv"));
    // All rows should have 3 columns
    const lines = result.content.split("\n");
    for (const line of lines) {
      const pipes = (line.match(/\|/g) || []).length;
      expect(pipes).toBe(4); // 3 columns = 4 pipe chars
    }
  });

  it("handles CRLF line endings", async () => {
    const csv = "Name,Age\r\nAlice,30\r\nBob,25";
    const result = await csvParser.parse(makeInput(csv, "csv"));
    expect(result.content).toContain("| Alice | 30 |");
  });

  it("canParse handles csv and tsv", () => {
    expect(csvParser.canParse(makeInput("", "csv"))).toBe(true);
    expect(csvParser.canParse(makeInput("", "tsv"))).toBe(true);
    expect(csvParser.canParse(makeInput("", "json"))).toBe(false);
  });
});

describe("yamlParser", () => {
  it("wraps YAML in code fence", async () => {
    const yaml = "name: Alice\nage: 30\nhobbies:\n  - reading\n  - coding";
    const result = await yamlParser.parse(makeInput(yaml, "yaml"));
    expect(result.format).toBe("markdown");
    expect(result.content).toContain("```yaml");
    expect(result.content).toContain("name: Alice");
    expect(result.content).toContain("  - reading");
  });

  it("handles multi-document YAML", async () => {
    const yaml = "---\nname: Alice\n---\nname: Bob";
    const result = await yamlParser.parse(makeInput(yaml, "yaml"));
    expect(result.content).toContain("---");
    expect(result.content).toContain("name: Alice");
    expect(result.content).toContain("name: Bob");
  });

  it("wraps TOML in code fence", async () => {
    const toml = '[package]\nname = "test"\nversion = "1.0.0"';
    const result = await yamlParser.parse(makeInput(toml, "toml"));
    expect(result.content).toContain("```toml");
    expect(result.content).toContain('[package]');
  });

  it("normalizes line endings", async () => {
    const yaml = "key: value\r\nother: 42";
    const result = await yamlParser.parse(makeInput(yaml, "yaml"));
    expect(result.content).not.toContain("\r");
  });

  it("canParse handles yaml and toml", () => {
    expect(yamlParser.canParse(makeInput("", "yaml"))).toBe(true);
    expect(yamlParser.canParse(makeInput("", "toml"))).toBe(true);
    expect(yamlParser.canParse(makeInput("", "json"))).toBe(false);
  });
});

describe("binaryParser", () => {
  it("returns helpful message for PDF", async () => {
    const result = await binaryParser.parse(makeInput("", "pdf"));
    expect(result.format).toBe("text");
    expect(result.content).toContain("PDF file detected");
    expect(result.content).toContain("requires external parser");
    expect(result.content).toContain("docling-node-ts");
  });

  it("returns helpful message for DOCX", async () => {
    const result = await binaryParser.parse(makeInput("", "docx"));
    expect(result.content).toContain("DOCX");
    expect(result.content).toContain("mammoth");
  });

  it("returns helpful message for PPTX", async () => {
    const result = await binaryParser.parse(makeInput("", "pptx"));
    expect(result.content).toContain("PPTX");
    expect(result.content).toContain("docling-node-ts");
  });

  it("returns helpful message for XLSX", async () => {
    const result = await binaryParser.parse(makeInput("", "xlsx"));
    expect(result.content).toContain("XLSX");
    expect(result.content).toContain("xlsx");
  });

  it("warns about legacy doc format", async () => {
    const result = await binaryParser.parse(makeInput("", "doc"));
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes("Legacy"))).toBe(true);
    expect(result.content).toContain("Convert to .docx");
  });

  it("warns about legacy xls format", async () => {
    const result = await binaryParser.parse(makeInput("", "xls"));
    expect(result.warnings!.some((w) => w.includes("Legacy"))).toBe(true);
  });

  it("warns about legacy ppt format", async () => {
    const result = await binaryParser.parse(makeInput("", "ppt"));
    expect(result.warnings!.some((w) => w.includes("Legacy"))).toBe(true);
  });

  it("handles ZIP format", async () => {
    const result = await binaryParser.parse(makeInput("", "zip"));
    expect(result.content).toContain("ZIP Archive");
  });

  it("handles GZIP format", async () => {
    const result = await binaryParser.parse(makeInput("", "gzip"));
    expect(result.content).toContain("GZIP");
    expect(result.content).toContain("node:zlib");
  });

  it("canParse returns true for binary formats", () => {
    for (const fmt of ["pdf", "docx", "pptx", "xlsx", "doc", "ppt", "xls", "odt", "rtf", "zip", "gzip"]) {
      expect(binaryParser.canParse(makeInput("", fmt))).toBe(true);
    }
    expect(binaryParser.canParse(makeInput("", "text"))).toBe(false);
  });
});

describe("imageParser", () => {
  it("returns descriptive message for PNG image", async () => {
    const buf = Buffer.alloc(1024);
    const result = await imageParser.parse(makeBufInput(buf, "image", { subtype: "png" }));
    expect(result.format).toBe("text");
    expect(result.content).toContain("PNG image detected");
    expect(result.content).toContain("tesseract.js");
  });

  it("returns descriptive message for JPEG image", async () => {
    const result = await imageParser.parse(makeInput("", "image", { subtype: "jpeg" }));
    expect(result.content).toContain("JPEG image detected");
  });

  it("handles SVG as text (code fence)", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
    const result = await imageParser.parse(makeInput(svg, "image", { subtype: "svg" }));
    expect(result.format).toBe("markdown");
    expect(result.content).toContain("```svg");
    expect(result.content).toContain("<circle");
  });

  it("includes file size in message", async () => {
    const buf = Buffer.alloc(2048);
    const result = await imageParser.parse(makeBufInput(buf, "image", { subtype: "png" }));
    expect(result.content).toContain("2.0 KB");
  });

  it("canParse returns true for image format", () => {
    expect(imageParser.canParse(makeInput("", "image"))).toBe(true);
    expect(imageParser.canParse(makeInput("", "text"))).toBe(false);
  });
});
