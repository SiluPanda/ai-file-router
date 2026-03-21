# ai-file-router

Auto-detect file type and route through the optimal parsing pipeline. Accepts any file (PDF, DOCX, HTML, CSV, JSON, YAML, Markdown, source code, images, and dozens more), detects the format via magic bytes, MIME type, and file extension, selects the best parser, and returns clean text or markdown ready for AI consumption.

Zero runtime dependencies. Built for RAG pipelines, document processing APIs, and knowledge base construction.

## Install

```bash
npm install ai-file-router
```

## Quick Start

```typescript
import { route } from "ai-file-router";

// Route a file by path
const result = await route("./report.csv");
console.log(result.content);
// | Name | Age | City |
// | --- | --- | --- |
// | Alice | 30 | NYC |

console.log(result.format);       // "markdown"
console.log(result.sourceFormat);  // "csv"
```

## API

### `route(source, options?): Promise<RouteResult>`

Route a single file through the parsing pipeline.

- **source** - File path (string), Buffer, or inline string content.
- **options.format** - Override auto-detected format (e.g. `"json"`, `"csv"`).
- **options.outputFormat** - Preferred output format: `"markdown"` or `"text"`.
- **options.mimeType** - MIME type hint for detection.
- **options.maxSize** - Maximum output size in characters (0 = unlimited).
- **options.fileName** - File name hint when input is a Buffer.
- **options.codeOptions.includeHeader** - Include a file metadata header for code files.

Returns a `RouteResult`:

```typescript
interface RouteResult {
  content: string;        // Extracted text or markdown
  format: "markdown" | "text";
  sourceFormat: string;   // Detected source format (e.g. "csv", "json", "code")
  mimeType?: string;
  metadata: {
    filePath?: string;
    fileSize?: number;
    wordCount?: number;
    fileName?: string;
  };
  warnings: string[];
  durationMs: number;
}
```

### `routeBatch(sources, options?): Promise<BatchRouteResult[]>`

Route multiple files with configurable concurrency.

```typescript
import { routeBatch } from "ai-file-router";

const results = await routeBatch(
  ["./data.csv", "./config.json", "./README.md"],
  { concurrency: 3 }
);
```

### `routeDirectory(dirPath, options?): Promise<BatchRouteResult[]>`

Recursively scan a directory and route all files.

```typescript
import { routeDirectory } from "ai-file-router";

const results = await routeDirectory("./docs", {
  recursive: true,
  include: ["*.md", "*.txt"],
  exclude: ["*.log"],
});
```

### `detectFormat(options): FormatInfo`

Detect a file's format without parsing it.

```typescript
import { detectFormat } from "ai-file-router";

const info = detectFormat({ filePath: "report.pdf" });
// { format: "pdf", confidence: 0.6, method: "extension" }

const info2 = detectFormat({ content: Buffer.from("%PDF-1.7...") });
// { format: "pdf", confidence: 1.0, method: "magic-bytes" }
```

### `registerParser(parser): void`

Register a custom parser for additional formats.

```typescript
import { registerParser, route } from "ai-file-router";

registerParser({
  name: "ini-parser",
  formats: ["ini"],
  canParse: (input) => input.formatInfo.format === "ini",
  parse: async (input) => ({
    content: convertIniToMarkdown(input.content.toString()),
    format: "markdown",
  }),
});

const result = await route(iniContent, { format: "ini" });
```

## Supported Formats

| Category | Formats | Output |
|----------|---------|--------|
| Text | `.txt`, `.log` | Plain text (passthrough) |
| Markdown | `.md`, `.markdown` | Markdown (passthrough with cleanup) |
| Code | `.js`, `.ts`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, `.rb`, `.php`, `.swift`, `.kt`, `.sh`, `.sql`, and 20+ more | Markdown (fenced code block) |
| Data | `.json` | Markdown (pretty-printed in code fence) |
| Data | `.yaml`, `.yml`, `.toml` | Markdown (in code fence) |
| Tabular | `.csv`, `.tsv` | Markdown (GFM table) |
| Web | `.html`, `.htm` | Markdown (tags converted) |
| Web | `.xml` | Markdown (in code fence) |
| Documents | `.pdf`, `.docx`, `.pptx`, `.xlsx` | Descriptive message (requires external parser) |
| Images | `.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.tiff` | Descriptive message (requires OCR) |
| Images | `.svg` | Markdown (in code fence) |

Binary formats (PDF, DOCX, PPTX, XLSX) return a helpful message with suggested external packages. Install `docling-node-ts` for full document conversion support.

## Format Detection

Detection uses four signals in priority order:

1. **Explicit format** (`options.format`) -- confidence 1.0
2. **Magic bytes** (file signatures) -- confidence 0.9-1.0
3. **MIME type** (`options.mimeType`) -- confidence 0.8
4. **File extension** -- confidence 0.6
5. **Content heuristic** (JSON braces, HTML tags, etc.) -- confidence 0.3-0.5

## License

MIT
