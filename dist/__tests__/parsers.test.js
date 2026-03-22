"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const text_js_1 = require("../parsers/text.js");
const markdown_js_1 = require("../parsers/markdown.js");
const html_js_1 = require("../parsers/html.js");
const json_js_1 = require("../parsers/json.js");
const csv_js_1 = require("../parsers/csv.js");
const yaml_js_1 = require("../parsers/yaml.js");
const binary_js_1 = require("../parsers/binary.js");
function makeInput(content, format, extra) {
    return {
        content,
        formatInfo: { format, confidence: 1.0, method: "explicit", ...extra },
    };
}
function makeBufInput(content, format, extra) {
    return {
        content,
        formatInfo: { format, confidence: 1.0, method: "explicit", ...extra },
    };
}
(0, vitest_1.describe)("textParser", () => {
    (0, vitest_1.it)("passes through plain text", async () => {
        const result = await text_js_1.textParser.parse(makeInput("Hello world", "text"));
        (0, vitest_1.expect)(result.content).toBe("Hello world");
        (0, vitest_1.expect)(result.format).toBe("text");
    });
    (0, vitest_1.it)("normalizes CRLF line endings", async () => {
        const result = await text_js_1.textParser.parse(makeInput("line1\r\nline2\r\nline3", "text"));
        (0, vitest_1.expect)(result.content).toBe("line1\nline2\nline3");
    });
    (0, vitest_1.it)("normalizes CR line endings", async () => {
        const result = await text_js_1.textParser.parse(makeInput("line1\rline2", "text"));
        (0, vitest_1.expect)(result.content).toBe("line1\nline2");
    });
    (0, vitest_1.it)("trims trailing whitespace per line", async () => {
        const result = await text_js_1.textParser.parse(makeInput("line1   \nline2\t\t\nline3", "text"));
        (0, vitest_1.expect)(result.content).toBe("line1\nline2\nline3");
    });
    (0, vitest_1.it)("trims trailing whitespace at end", async () => {
        const result = await text_js_1.textParser.parse(makeInput("content\n\n\n", "text"));
        (0, vitest_1.expect)(result.content).toBe("content");
    });
    (0, vitest_1.it)("handles Buffer input", async () => {
        const result = await text_js_1.textParser.parse(makeBufInput(Buffer.from("buffer text"), "text"));
        (0, vitest_1.expect)(result.content).toBe("buffer text");
    });
    (0, vitest_1.it)("canParse returns true for text format", () => {
        (0, vitest_1.expect)(text_js_1.textParser.canParse(makeInput("", "text"))).toBe(true);
    });
    (0, vitest_1.it)("canParse returns false for other formats", () => {
        (0, vitest_1.expect)(text_js_1.textParser.canParse(makeInput("", "json"))).toBe(false);
    });
});
(0, vitest_1.describe)("codeParser", () => {
    (0, vitest_1.it)("wraps code in fenced code block with language", async () => {
        const input = makeInput("const x = 1;", "code", { language: "typescript" });
        const result = await text_js_1.codeParser.parse(input);
        (0, vitest_1.expect)(result.content).toBe("```typescript\nconst x = 1;\n```");
        (0, vitest_1.expect)(result.format).toBe("markdown");
    });
    (0, vitest_1.it)("wraps code without language tag when none provided", async () => {
        const input = makeInput("some code", "code");
        const result = await text_js_1.codeParser.parse(input);
        (0, vitest_1.expect)(result.content).toBe("```\nsome code\n```");
    });
    (0, vitest_1.it)("includes header when codeOptions.includeHeader is true", async () => {
        const input = {
            content: "print('hello')",
            formatInfo: { format: "code", confidence: 1.0, method: "explicit", language: "python" },
            fileName: "script.py",
        };
        const result = await text_js_1.codeParser.parse(input, { codeOptions: { includeHeader: true } });
        (0, vitest_1.expect)(result.content).toContain("## File: script.py (python)");
        (0, vitest_1.expect)(result.content).toContain("```python");
        (0, vitest_1.expect)(result.content).toContain("print('hello')");
    });
    (0, vitest_1.it)("normalizes line endings in code", async () => {
        const input = makeInput("line1\r\nline2", "code", { language: "javascript" });
        const result = await text_js_1.codeParser.parse(input);
        (0, vitest_1.expect)(result.content).toBe("```javascript\nline1\nline2\n```");
    });
    (0, vitest_1.it)("canParse returns true for code format", () => {
        (0, vitest_1.expect)(text_js_1.codeParser.canParse(makeInput("", "code"))).toBe(true);
    });
    (0, vitest_1.it)("canParse returns false for non-code", () => {
        (0, vitest_1.expect)(text_js_1.codeParser.canParse(makeInput("", "text"))).toBe(false);
    });
});
(0, vitest_1.describe)("markdownParser", () => {
    (0, vitest_1.it)("passes through markdown", async () => {
        const md = "# Title\n\nParagraph here.\n\n## Section\n\nMore text.";
        const result = await markdown_js_1.markdownParser.parse(makeInput(md, "markdown"));
        (0, vitest_1.expect)(result.content).toBe(md);
        (0, vitest_1.expect)(result.format).toBe("markdown");
    });
    (0, vitest_1.it)("normalizes line endings", async () => {
        const result = await markdown_js_1.markdownParser.parse(makeInput("# Title\r\n\r\nContent", "markdown"));
        (0, vitest_1.expect)(result.content).toBe("# Title\n\nContent");
    });
    (0, vitest_1.it)("collapses excessive blank lines", async () => {
        const result = await markdown_js_1.markdownParser.parse(makeInput("# Title\n\n\n\n\nContent", "markdown"));
        (0, vitest_1.expect)(result.content).toBe("# Title\n\nContent");
    });
    (0, vitest_1.it)("strips markdown when outputFormat is text", async () => {
        const md = "# Title\n\n**Bold text** and *italic*.\n\n[Link](http://example.com)";
        const result = await markdown_js_1.markdownParser.parse(makeInput(md, "markdown"), { outputFormat: "text" });
        (0, vitest_1.expect)(result.format).toBe("text");
        (0, vitest_1.expect)(result.content).not.toContain("#");
        (0, vitest_1.expect)(result.content).not.toContain("**");
        (0, vitest_1.expect)(result.content).not.toContain("*");
        (0, vitest_1.expect)(result.content).toContain("Bold text");
        (0, vitest_1.expect)(result.content).toContain("Link");
    });
    (0, vitest_1.it)("canParse returns true for markdown", () => {
        (0, vitest_1.expect)(markdown_js_1.markdownParser.canParse(makeInput("", "markdown"))).toBe(true);
    });
});
(0, vitest_1.describe)("htmlParser", () => {
    (0, vitest_1.it)("converts simple HTML to markdown", async () => {
        const html = "<h1>Title</h1><p>Paragraph text.</p>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.format).toBe("markdown");
        (0, vitest_1.expect)(result.content).toContain("# Title");
        (0, vitest_1.expect)(result.content).toContain("Paragraph text.");
    });
    (0, vitest_1.it)("converts headings at all levels", async () => {
        const html = "<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).toContain("# H1");
        (0, vitest_1.expect)(result.content).toContain("## H2");
        (0, vitest_1.expect)(result.content).toContain("### H3");
        (0, vitest_1.expect)(result.content).toContain("#### H4");
        (0, vitest_1.expect)(result.content).toContain("##### H5");
        (0, vitest_1.expect)(result.content).toContain("###### H6");
    });
    (0, vitest_1.it)("converts bold and italic", async () => {
        const html = "<p><strong>bold</strong> and <em>italic</em></p>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).toContain("**bold**");
        (0, vitest_1.expect)(result.content).toContain("*italic*");
    });
    (0, vitest_1.it)("converts links", async () => {
        const html = '<p><a href="https://example.com">Click here</a></p>';
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).toContain("[Click here](https://example.com)");
    });
    (0, vitest_1.it)("converts unordered lists", async () => {
        const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).toContain("- Item 1");
        (0, vitest_1.expect)(result.content).toContain("- Item 2");
    });
    (0, vitest_1.it)("converts ordered lists", async () => {
        const html = "<ol><li>First</li><li>Second</li></ol>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).toContain("1. First");
        (0, vitest_1.expect)(result.content).toContain("2. Second");
    });
    (0, vitest_1.it)("converts tables to markdown", async () => {
        const html = "<table><tr><th>Name</th><th>Age</th></tr><tr><td>Alice</td><td>30</td></tr></table>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).toContain("| Name | Age |");
        (0, vitest_1.expect)(result.content).toContain("| --- | --- |");
        (0, vitest_1.expect)(result.content).toContain("| Alice | 30 |");
    });
    (0, vitest_1.it)("removes script tags", async () => {
        const html = "<p>Text</p><script>alert('xss')</script><p>More</p>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).not.toContain("alert");
        (0, vitest_1.expect)(result.content).not.toContain("script");
        (0, vitest_1.expect)(result.content).toContain("Text");
        (0, vitest_1.expect)(result.content).toContain("More");
    });
    (0, vitest_1.it)("removes style tags", async () => {
        const html = "<style>body { color: red; }</style><p>Content</p>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).not.toContain("color");
        (0, vitest_1.expect)(result.content).toContain("Content");
    });
    (0, vitest_1.it)("decodes HTML entities", async () => {
        const html = "<p>&amp; &lt; &gt; &quot; &#39;</p>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).toContain("& < > \" '");
    });
    (0, vitest_1.it)("converts blockquotes", async () => {
        const html = "<blockquote>Quoted text here</blockquote>";
        const result = await html_js_1.htmlParser.parse(makeInput(html, "html"));
        (0, vitest_1.expect)(result.content).toContain("> Quoted text here");
    });
    (0, vitest_1.it)("handles XML format by wrapping in code fence", async () => {
        const xml = '<?xml version="1.0"?>\n<root><item>value</item></root>';
        const result = await html_js_1.htmlParser.parse(makeInput(xml, "xml"));
        (0, vitest_1.expect)(result.format).toBe("markdown");
        (0, vitest_1.expect)(result.content).toContain("```xml");
        (0, vitest_1.expect)(result.content).toContain("<root>");
    });
    (0, vitest_1.it)("canParse returns true for html and xml", () => {
        (0, vitest_1.expect)(html_js_1.htmlParser.canParse(makeInput("", "html"))).toBe(true);
        (0, vitest_1.expect)(html_js_1.htmlParser.canParse(makeInput("", "xml"))).toBe(true);
        (0, vitest_1.expect)(html_js_1.htmlParser.canParse(makeInput("", "text"))).toBe(false);
    });
});
(0, vitest_1.describe)("jsonParser", () => {
    (0, vitest_1.it)("pretty-prints valid JSON in code fence", async () => {
        const json = '{"name":"Alice","age":30}';
        const result = await json_js_1.jsonParser.parse(makeInput(json, "json"));
        (0, vitest_1.expect)(result.format).toBe("markdown");
        (0, vitest_1.expect)(result.content).toContain("```json");
        (0, vitest_1.expect)(result.content).toContain('"name": "Alice"');
        (0, vitest_1.expect)(result.content).toContain('"age": 30');
    });
    (0, vitest_1.it)("handles JSON arrays", async () => {
        const json = "[1, 2, 3]";
        const result = await json_js_1.jsonParser.parse(makeInput(json, "json"));
        (0, vitest_1.expect)(result.content).toContain("```json");
        (0, vitest_1.expect)(result.content).toContain("1");
    });
    (0, vitest_1.it)("handles nested JSON", async () => {
        const json = '{"user":{"name":"Bob","scores":[1,2,3]}}';
        const result = await json_js_1.jsonParser.parse(makeInput(json, "json"));
        (0, vitest_1.expect)(result.content).toContain('"user"');
        (0, vitest_1.expect)(result.content).toContain('"name": "Bob"');
    });
    (0, vitest_1.it)("handles invalid JSON with warning", async () => {
        const result = await json_js_1.jsonParser.parse(makeInput("{invalid json}", "json"));
        (0, vitest_1.expect)(result.warnings).toBeDefined();
        (0, vitest_1.expect)(result.warnings.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.content).toContain("```json");
        (0, vitest_1.expect)(result.content).toContain("{invalid json}");
    });
    (0, vitest_1.it)("summarizes large JSON", async () => {
        const largeObj = {};
        for (let i = 0; i < 500; i++) {
            largeObj[`key_${i}`] = "x".repeat(100);
        }
        const json = JSON.stringify(largeObj);
        const result = await json_js_1.jsonParser.parse(makeInput(json, "json"));
        (0, vitest_1.expect)(result.warnings).toBeDefined();
        (0, vitest_1.expect)(result.warnings.some((w) => w.includes("truncated"))).toBe(true);
    });
    (0, vitest_1.it)("handles empty object", async () => {
        const result = await json_js_1.jsonParser.parse(makeInput("{}", "json"));
        (0, vitest_1.expect)(result.content).toContain("```json");
        (0, vitest_1.expect)(result.content).toContain("{}");
    });
    (0, vitest_1.it)("handles null value", async () => {
        const result = await json_js_1.jsonParser.parse(makeInput("null", "json"));
        (0, vitest_1.expect)(result.content).toContain("null");
    });
    (0, vitest_1.it)("handles Buffer input", async () => {
        const result = await json_js_1.jsonParser.parse(makeBufInput(Buffer.from('{"a":1}'), "json"));
        (0, vitest_1.expect)(result.content).toContain('"a": 1');
    });
});
(0, vitest_1.describe)("csvParser", () => {
    (0, vitest_1.it)("converts CSV to markdown table", async () => {
        const csv = "Name,Age,City\nAlice,30,NYC\nBob,25,LA";
        const result = await csv_js_1.csvParser.parse(makeInput(csv, "csv"));
        (0, vitest_1.expect)(result.format).toBe("markdown");
        (0, vitest_1.expect)(result.content).toContain("| Name | Age | City |");
        (0, vitest_1.expect)(result.content).toContain("| --- | --- | --- |");
        (0, vitest_1.expect)(result.content).toContain("| Alice | 30 | NYC |");
        (0, vitest_1.expect)(result.content).toContain("| Bob | 25 | LA |");
    });
    (0, vitest_1.it)("handles quoted fields with commas", async () => {
        const csv = 'Name,Description\nAlice,"Has, commas"\nBob,Simple';
        const result = await csv_js_1.csvParser.parse(makeInput(csv, "csv"));
        (0, vitest_1.expect)(result.content).toContain("| Alice | Has, commas |");
    });
    (0, vitest_1.it)("handles escaped quotes in fields", async () => {
        const csv = 'Name,Quote\nAlice,"She said ""hello"""\nBob,Normal';
        const result = await csv_js_1.csvParser.parse(makeInput(csv, "csv"));
        (0, vitest_1.expect)(result.content).toContain('She said "hello"');
    });
    (0, vitest_1.it)("handles TSV format", async () => {
        const tsv = "Name\tAge\nAlice\t30\nBob\t25";
        const result = await csv_js_1.csvParser.parse(makeInput(tsv, "tsv"));
        (0, vitest_1.expect)(result.format).toBe("markdown");
        (0, vitest_1.expect)(result.content).toContain("| Name | Age |");
        (0, vitest_1.expect)(result.content).toContain("| Alice | 30 |");
    });
    (0, vitest_1.it)("handles empty file", async () => {
        const result = await csv_js_1.csvParser.parse(makeInput("", "csv"));
        (0, vitest_1.expect)(result.content).toBe("(empty file)");
        (0, vitest_1.expect)(result.format).toBe("text");
    });
    (0, vitest_1.it)("handles single row (header only)", async () => {
        const result = await csv_js_1.csvParser.parse(makeInput("Name,Age", "csv"));
        (0, vitest_1.expect)(result.content).toContain("| Name | Age |");
        (0, vitest_1.expect)(result.content).toContain("| --- | --- |");
    });
    (0, vitest_1.it)("normalizes uneven columns", async () => {
        const csv = "A,B,C\n1,2\n3,4,5";
        const result = await csv_js_1.csvParser.parse(makeInput(csv, "csv"));
        // All rows should have 3 columns
        const lines = result.content.split("\n");
        for (const line of lines) {
            const pipes = (line.match(/\|/g) || []).length;
            (0, vitest_1.expect)(pipes).toBe(4); // 3 columns = 4 pipe chars
        }
    });
    (0, vitest_1.it)("handles CRLF line endings", async () => {
        const csv = "Name,Age\r\nAlice,30\r\nBob,25";
        const result = await csv_js_1.csvParser.parse(makeInput(csv, "csv"));
        (0, vitest_1.expect)(result.content).toContain("| Alice | 30 |");
    });
    (0, vitest_1.it)("canParse handles csv and tsv", () => {
        (0, vitest_1.expect)(csv_js_1.csvParser.canParse(makeInput("", "csv"))).toBe(true);
        (0, vitest_1.expect)(csv_js_1.csvParser.canParse(makeInput("", "tsv"))).toBe(true);
        (0, vitest_1.expect)(csv_js_1.csvParser.canParse(makeInput("", "json"))).toBe(false);
    });
});
(0, vitest_1.describe)("yamlParser", () => {
    (0, vitest_1.it)("wraps YAML in code fence", async () => {
        const yaml = "name: Alice\nage: 30\nhobbies:\n  - reading\n  - coding";
        const result = await yaml_js_1.yamlParser.parse(makeInput(yaml, "yaml"));
        (0, vitest_1.expect)(result.format).toBe("markdown");
        (0, vitest_1.expect)(result.content).toContain("```yaml");
        (0, vitest_1.expect)(result.content).toContain("name: Alice");
        (0, vitest_1.expect)(result.content).toContain("  - reading");
    });
    (0, vitest_1.it)("handles multi-document YAML", async () => {
        const yaml = "---\nname: Alice\n---\nname: Bob";
        const result = await yaml_js_1.yamlParser.parse(makeInput(yaml, "yaml"));
        (0, vitest_1.expect)(result.content).toContain("---");
        (0, vitest_1.expect)(result.content).toContain("name: Alice");
        (0, vitest_1.expect)(result.content).toContain("name: Bob");
    });
    (0, vitest_1.it)("wraps TOML in code fence", async () => {
        const toml = '[package]\nname = "test"\nversion = "1.0.0"';
        const result = await yaml_js_1.yamlParser.parse(makeInput(toml, "toml"));
        (0, vitest_1.expect)(result.content).toContain("```toml");
        (0, vitest_1.expect)(result.content).toContain('[package]');
    });
    (0, vitest_1.it)("normalizes line endings", async () => {
        const yaml = "key: value\r\nother: 42";
        const result = await yaml_js_1.yamlParser.parse(makeInput(yaml, "yaml"));
        (0, vitest_1.expect)(result.content).not.toContain("\r");
    });
    (0, vitest_1.it)("canParse handles yaml and toml", () => {
        (0, vitest_1.expect)(yaml_js_1.yamlParser.canParse(makeInput("", "yaml"))).toBe(true);
        (0, vitest_1.expect)(yaml_js_1.yamlParser.canParse(makeInput("", "toml"))).toBe(true);
        (0, vitest_1.expect)(yaml_js_1.yamlParser.canParse(makeInput("", "json"))).toBe(false);
    });
});
(0, vitest_1.describe)("binaryParser", () => {
    (0, vitest_1.it)("returns helpful message for PDF", async () => {
        const result = await binary_js_1.binaryParser.parse(makeInput("", "pdf"));
        (0, vitest_1.expect)(result.format).toBe("text");
        (0, vitest_1.expect)(result.content).toContain("PDF file detected");
        (0, vitest_1.expect)(result.content).toContain("requires external parser");
        (0, vitest_1.expect)(result.content).toContain("docling-node-ts");
    });
    (0, vitest_1.it)("returns helpful message for DOCX", async () => {
        const result = await binary_js_1.binaryParser.parse(makeInput("", "docx"));
        (0, vitest_1.expect)(result.content).toContain("DOCX");
        (0, vitest_1.expect)(result.content).toContain("mammoth");
    });
    (0, vitest_1.it)("returns helpful message for PPTX", async () => {
        const result = await binary_js_1.binaryParser.parse(makeInput("", "pptx"));
        (0, vitest_1.expect)(result.content).toContain("PPTX");
        (0, vitest_1.expect)(result.content).toContain("docling-node-ts");
    });
    (0, vitest_1.it)("returns helpful message for XLSX", async () => {
        const result = await binary_js_1.binaryParser.parse(makeInput("", "xlsx"));
        (0, vitest_1.expect)(result.content).toContain("XLSX");
        (0, vitest_1.expect)(result.content).toContain("xlsx");
    });
    (0, vitest_1.it)("warns about legacy doc format", async () => {
        const result = await binary_js_1.binaryParser.parse(makeInput("", "doc"));
        (0, vitest_1.expect)(result.warnings).toBeDefined();
        (0, vitest_1.expect)(result.warnings.some((w) => w.includes("Legacy"))).toBe(true);
        (0, vitest_1.expect)(result.content).toContain("Convert to .docx");
    });
    (0, vitest_1.it)("warns about legacy xls format", async () => {
        const result = await binary_js_1.binaryParser.parse(makeInput("", "xls"));
        (0, vitest_1.expect)(result.warnings.some((w) => w.includes("Legacy"))).toBe(true);
    });
    (0, vitest_1.it)("warns about legacy ppt format", async () => {
        const result = await binary_js_1.binaryParser.parse(makeInput("", "ppt"));
        (0, vitest_1.expect)(result.warnings.some((w) => w.includes("Legacy"))).toBe(true);
    });
    (0, vitest_1.it)("handles ZIP format", async () => {
        const result = await binary_js_1.binaryParser.parse(makeInput("", "zip"));
        (0, vitest_1.expect)(result.content).toContain("ZIP Archive");
    });
    (0, vitest_1.it)("handles GZIP format", async () => {
        const result = await binary_js_1.binaryParser.parse(makeInput("", "gzip"));
        (0, vitest_1.expect)(result.content).toContain("GZIP");
        (0, vitest_1.expect)(result.content).toContain("node:zlib");
    });
    (0, vitest_1.it)("canParse returns true for binary formats", () => {
        for (const fmt of ["pdf", "docx", "pptx", "xlsx", "doc", "ppt", "xls", "odt", "rtf", "zip", "gzip"]) {
            (0, vitest_1.expect)(binary_js_1.binaryParser.canParse(makeInput("", fmt))).toBe(true);
        }
        (0, vitest_1.expect)(binary_js_1.binaryParser.canParse(makeInput("", "text"))).toBe(false);
    });
});
(0, vitest_1.describe)("imageParser", () => {
    (0, vitest_1.it)("returns descriptive message for PNG image", async () => {
        const buf = Buffer.alloc(1024);
        const result = await binary_js_1.imageParser.parse(makeBufInput(buf, "image", { subtype: "png" }));
        (0, vitest_1.expect)(result.format).toBe("text");
        (0, vitest_1.expect)(result.content).toContain("PNG image detected");
        (0, vitest_1.expect)(result.content).toContain("tesseract.js");
    });
    (0, vitest_1.it)("returns descriptive message for JPEG image", async () => {
        const result = await binary_js_1.imageParser.parse(makeInput("", "image", { subtype: "jpeg" }));
        (0, vitest_1.expect)(result.content).toContain("JPEG image detected");
    });
    (0, vitest_1.it)("handles SVG as text (code fence)", async () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
        const result = await binary_js_1.imageParser.parse(makeInput(svg, "image", { subtype: "svg" }));
        (0, vitest_1.expect)(result.format).toBe("markdown");
        (0, vitest_1.expect)(result.content).toContain("```svg");
        (0, vitest_1.expect)(result.content).toContain("<circle");
    });
    (0, vitest_1.it)("includes file size in message", async () => {
        const buf = Buffer.alloc(2048);
        const result = await binary_js_1.imageParser.parse(makeBufInput(buf, "image", { subtype: "png" }));
        (0, vitest_1.expect)(result.content).toContain("2.0 KB");
    });
    (0, vitest_1.it)("canParse returns true for image format", () => {
        (0, vitest_1.expect)(binary_js_1.imageParser.canParse(makeInput("", "image"))).toBe(true);
        (0, vitest_1.expect)(binary_js_1.imageParser.canParse(makeInput("", "text"))).toBe(false);
    });
});
//# sourceMappingURL=parsers.test.js.map