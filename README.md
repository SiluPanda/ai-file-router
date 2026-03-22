# ai-file-router

Auto-detect file type and route through the optimal parsing pipeline.

[![npm version](https://img.shields.io/npm/v/ai-file-router.svg)](https://www.npmjs.com/package/ai-file-router)
[![license](https://img.shields.io/npm/l/ai-file-router.svg)](https://github.com/SiluPanda/ai-file-router/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/ai-file-router.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

Accepts any file -- PDF, DOCX, HTML, CSV, JSON, YAML, Markdown, source code, images, and dozens more -- detects the format via magic bytes, MIME type, and file extension, selects the best parser, and returns clean text or markdown ready for AI consumption. Zero runtime dependencies. Built for RAG pipelines, document processing APIs, and knowledge base construction.

## Installation

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
console.log(result.durationMs);   // 2
```

Route inline content or Buffers just as easily:

```typescript
// Inline string with a format hint
const json = await route('{"key": "value"}', { format: "json" });
console.log(json.content);
// ```json
// {
//   "key": "value"
// }
// ```

// Buffer with a fileName hint
const buf = Buffer.from("Name,Age\nAlice,30");
const csv = await route(buf, { mimeType: "text/csv" });
console.log(csv.sourceFormat); // "csv"
```

## Features

- **Automatic format detection** -- magic bytes, MIME types, file extensions, and content heuristics, scored by confidence.
- **40+ file formats** -- text, markdown, code (35+ languages), JSON, YAML, TOML, CSV, TSV, HTML, XML, SVG, and binary formats (PDF, DOCX, PPTX, XLSX, images).
- **AI-ready output** -- every format converts to clean markdown or plain text, ready to drop into an LLM context window.
- **Batch and directory processing** -- `routeBatch` and `routeDirectory` process many files with configurable concurrency.
- **Extensible parser registry** -- register custom parsers that take priority over built-ins.
- **Zero runtime dependencies** -- only Node.js built-in modules.
- **Full TypeScript** -- strict mode, exported types for every interface.

## API Reference

### `route(source, options?)`

Route a single file through the parsing pipeline.

**Signature:**

```typescript
function route(source: string | Buffer, options?: RouteOptions): Promise<RouteResult>
```

**Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `string \| Buffer` | A file path, inline string content, or a `Buffer`. When a string is provided that exists on disk (or looks like a path), it is read as a file. Otherwise it is treated as inline content. |
| `options` | `RouteOptions` | Optional configuration (see below). |

**`RouteOptions`:**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `format` | `string` | auto-detect | Override auto-detected format (e.g. `"json"`, `"csv"`, `"code"`). Sets confidence to 1.0. |
| `outputFormat` | `"markdown" \| "text"` | parser default | Preferred output format. When set to `"text"` on a markdown file, markdown syntax is stripped. |
| `mimeType` | `string` | `undefined` | MIME type hint for detection (confidence 0.8). |
| `maxSize` | `number` | `0` (unlimited) | Maximum output size in characters. Content exceeding this limit is truncated and a warning is added. |
| `fileName` | `string` | `undefined` | File name hint used for extension-based detection when input is a Buffer or inline string. |
| `codeOptions.includeHeader` | `boolean` | `false` | When `true`, prepends a `## File: <name> (<language>)` header to code output. |

**Returns:** `Promise<RouteResult>`

```typescript
interface RouteResult {
  content: string;                // Extracted text or markdown
  format: "markdown" | "text";   // Output format
  sourceFormat: string;           // Detected source format (e.g. "csv", "json", "code", "image")
  mimeType?: string;              // MIME type of the source, if known
  metadata: {
    filePath?: string;            // Original file path
    fileSize?: number;            // File size in bytes
    wordCount?: number;           // Approximate word count of output
    fileName?: string;            // Original file name
  };
  warnings: string[];             // Warnings generated during parsing
  durationMs: number;             // Processing duration in milliseconds
}
```

**Example:**

```typescript
import { route } from "ai-file-router";

const result = await route("./src/index.ts", {
  codeOptions: { includeHeader: true },
});

console.log(result.content);
// ## File: index.ts (typescript)
//
// ```typescript
// import { readFileSync } from 'fs';
// ...
// ```

console.log(result.metadata.wordCount); // 42
```

---

### `routeBatch(sources, options?)`

Route multiple files through the parsing pipeline with configurable concurrency.

**Signature:**

```typescript
function routeBatch(
  sources: Array<string | Buffer>,
  options?: BatchOptions
): Promise<BatchRouteResult[]>
```

**Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `sources` | `Array<string \| Buffer>` | Array of file paths, inline strings, or Buffers. |
| `options` | `BatchOptions` | All `RouteOptions` fields plus `concurrency`. |

**`BatchOptions` (extends `RouteOptions`):**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `concurrency` | `number` | `5` | Maximum number of files processed simultaneously. |
| `include` | `string[]` | all files | Glob patterns to include (used by `routeDirectory`). |
| `exclude` | `string[]` | none | Glob patterns to exclude (used by `routeDirectory`). |
| `recursive` | `boolean` | `true` | Whether to scan directories recursively (used by `routeDirectory`). |

**Returns:** `Promise<BatchRouteResult[]>`

```typescript
interface BatchRouteResult {
  source: string;          // Source path or "(buffer)" for Buffer inputs
  result?: RouteResult;    // Present on success
  error?: string;          // Present on failure
}
```

**Example:**

```typescript
import { routeBatch } from "ai-file-router";

const results = await routeBatch(
  ["./data.csv", "./config.json", "./README.md"],
  { concurrency: 3 }
);

for (const r of results) {
  if (r.result) {
    console.log(`${r.source}: ${r.result.sourceFormat} (${r.result.metadata.wordCount} words)`);
  } else {
    console.error(`${r.source}: ${r.error}`);
  }
}
```

---

### `routeDirectory(dirPath, options?)`

Recursively scan a directory and route all files through the parsing pipeline.

**Signature:**

```typescript
function routeDirectory(dirPath: string, options?: BatchOptions): Promise<BatchRouteResult[]>
```

Automatically skips `node_modules`, `.git`, `__pycache__`, `.next`, `dist`, and `build` directories.

**Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `dirPath` | `string` | Directory path to scan. |
| `options` | `BatchOptions` | All batch options apply. `include`/`exclude` filter file names with glob patterns (`*` and `**` supported). |

**Example:**

```typescript
import { routeDirectory } from "ai-file-router";

const results = await routeDirectory("./docs", {
  recursive: true,
  include: ["*.md", "*.txt"],
  exclude: ["*.log"],
  concurrency: 10,
});

console.log(`Processed ${results.length} files`);
```

---

### `detectFormat(options)`

Detect a file's format without parsing it. Useful for pre-filtering or routing decisions.

**Signature:**

```typescript
function detectFormat(options: {
  content?: Buffer | string;
  filePath?: string;
  mimeType?: string;
  format?: string;
  fileName?: string;
}): FormatInfo
```

**Returns:** `FormatInfo`

```typescript
interface FormatInfo {
  format: string;              // Format identifier (e.g. "pdf", "csv", "code", "image", "text")
  confidence: number;          // Confidence score from 0 to 1
  method: DetectionMethod;     // "explicit" | "magic-bytes" | "mime-type" | "extension" | "content-heuristic"
  mimeType?: string;           // MIME type if known
  extension?: string;          // File extension with leading dot (e.g. ".csv")
  language?: string;           // Programming language for code files (e.g. "typescript", "python")
  subtype?: string;            // Image subtype (e.g. "png", "jpeg", "svg")
}
```

**Example:**

```typescript
import { detectFormat } from "ai-file-router";

// Detect from file extension
detectFormat({ filePath: "report.pdf" });
// { format: "pdf", confidence: 0.6, method: "extension", mimeType: "application/pdf", extension: ".pdf" }

// Detect from magic bytes (highest confidence for binary formats)
detectFormat({ content: Buffer.from("%PDF-1.7...") });
// { format: "pdf", confidence: 1.0, method: "magic-bytes", mimeType: "application/pdf" }

// Detect from MIME type
detectFormat({ mimeType: "text/csv" });
// { format: "csv", confidence: 0.8, method: "mime-type", mimeType: "text/csv" }

// Detect from content heuristics
detectFormat({ content: '{"key": "value"}' });
// { format: "json", confidence: 0.5, method: "content-heuristic" }
```

---

### `registerParser(parser)`

Register a custom parser in the global registry. Custom parsers take priority over all built-in parsers, so you can override default behavior or add support for new formats.

**Signature:**

```typescript
function registerParser(parser: Parser): void
```

**`Parser` interface:**

```typescript
interface Parser {
  name: string;                                              // Human-readable name
  formats: string[];                                         // Format identifiers this parser handles
  canParse(input: ParserInput): boolean;                     // Return true if this parser can handle the input
  parse(input: ParserInput, options?: RouteOptions): Promise<ParserOutput>;  // Parse and return content
}

interface ParserInput {
  content: Buffer | string;     // File content
  formatInfo: FormatInfo;       // Detected format info
  filePath?: string;            // Original file path
  fileName?: string;            // File name
}

interface ParserOutput {
  content: string;              // Parsed content
  format: "markdown" | "text";  // Output format
  warnings?: string[];          // Optional warnings
}
```

**Example:**

```typescript
import { registerParser, route } from "ai-file-router";

registerParser({
  name: "ini-parser",
  formats: ["ini"],
  canParse: (input) => input.formatInfo.format === "ini",
  parse: async (input) => {
    const text = typeof input.content === "string"
      ? input.content
      : input.content.toString("utf-8");

    const lines = text.split("\n");
    const md: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        md.push(`## ${trimmed.slice(1, -1)}`);
      } else if (trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        md.push(`- **${key.trim()}**: ${rest.join("=").trim()}`);
      }
    }
    return { content: md.join("\n"), format: "markdown" };
  },
});

const result = await route("[db]\nhost=localhost\nport=5432", { format: "ini" });
console.log(result.content);
// ## db
// - **host**: localhost
// - **port**: 5432
```

---

### `getRegistry()`

Get the global `ParserRegistry` instance. Useful for inspecting registered parsers and supported formats.

**Signature:**

```typescript
function getRegistry(): ParserRegistry
```

**`ParserRegistry` methods:**

| Method | Returns | Description |
| --- | --- | --- |
| `register(parser)` | `void` | Register a custom parser. |
| `findParser(input)` | `Parser \| null` | Find the best parser for a given input. Checks custom parsers first, then built-ins. |
| `getAllParsers()` | `Parser[]` | Get all registered parsers (custom first, then built-in). |
| `getSupportedFormats()` | `string[]` | Get all supported format identifiers. |

**Example:**

```typescript
import { getRegistry, ParserRegistry } from "ai-file-router";

// Inspect the global registry
const registry = getRegistry();
console.log(registry.getSupportedFormats());
// ["text", "code", "markdown", "html", "xml", "json", "csv", "tsv", "yaml", "toml", "pdf", "docx", ...]

// Or create a standalone registry
const custom = new ParserRegistry();
custom.register(myParser);
```

---

### Built-in Parsers

The following parsers are exported for advanced use (e.g. composing custom parsers or testing):

```typescript
import {
  textParser,
  codeParser,
  markdownParser,
  htmlParser,
  jsonParser,
  csvParser,
  yamlParser,
  binaryParser,
  imageParser,
} from "ai-file-router";
```

Each implements the `Parser` interface. See the [Supported Formats](#supported-formats) table for which formats each parser handles.

## Supported Formats

| Category | Formats | Output |
| --- | --- | --- |
| Text | `.txt`, `.log` | Plain text (passthrough with whitespace normalization) |
| Markdown | `.md`, `.markdown` | Markdown (passthrough with cleanup; optional strip to plain text via `outputFormat: "text"`) |
| Code | `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`, `.jsx`, `.tsx`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.h`, `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hxx`, `.cs`, `.rb`, `.php`, `.swift`, `.kt`, `.kts`, `.scala`, `.sh`, `.bash`, `.zsh`, `.sql`, `.r`, `.lua`, `.pl`, `.pm`, `.ex`, `.exs`, `.erl`, `.hs`, `.dart`, `.vue`, `.svelte`, `.css`, `.scss`, `.sass`, `.less`, `.graphql`, `.gql`, `.proto`, `.tf`, `Dockerfile`, `Makefile` | Markdown (fenced code block with language tag) |
| Data | `.json` | Markdown (pretty-printed in code fence; large files get a structure summary) |
| Data | `.yaml`, `.yml`, `.toml` | Markdown (in code fence) |
| Tabular | `.csv`, `.tsv` | Markdown (GFM table with RFC 4180 parsing) |
| Web | `.html`, `.htm` | Markdown (headings, lists, tables, links, bold/italic, blockquotes preserved; scripts and styles removed) |
| Web | `.xml` | Markdown (in code fence) |
| Documents | `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.doc`, `.ppt`, `.xls`, `.odt`, `.rtf` | Descriptive message with suggested external packages |
| Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.tiff`, `.tif` | Descriptive message with OCR/multimodal LLM suggestions |
| Images | `.svg` | Markdown (in code fence) |
| Archives | `.zip`, `.gzip` | Descriptive message with suggested packages |

Binary formats (PDF, DOCX, PPTX, XLSX, images) return a helpful message with suggested external packages. Register a custom parser to add full binary content extraction -- for example, use `docling-node-ts` for document conversion.

## Configuration

### Format Detection Priority

Detection uses five signals in strict priority order:

| Priority | Signal | Confidence | Example |
| --- | --- | --- | --- |
| 1 | Explicit `options.format` | 1.0 | `{ format: "json" }` |
| 2 | Magic bytes (file signature) | 0.9 -- 1.0 | `%PDF`, PNG header, ZIP header |
| 3 | MIME type (`options.mimeType`) | 0.8 | `"text/csv"` |
| 4 | File extension | 0.6 | `.json`, `.py`, `.csv` |
| 5 | Content heuristic | 0.3 -- 0.5 | JSON braces, HTML tags, YAML `---` |

The `application/octet-stream` MIME type is ignored as uninformative.

ZIP magic bytes are disambiguated using the file extension: `.docx`, `.pptx`, `.xlsx`, and `.odt` are recognized as their respective Office formats rather than generic ZIP.

### Output Truncation

Set `maxSize` to limit output length. Content exceeding the limit is truncated and a warning is added to `warnings`:

```typescript
const result = await route(largeContent, { format: "text", maxSize: 5000 });
// result.warnings: ["Output truncated to 5000 characters"]
```

### Directory Scanning

`routeDirectory` skips these directories by default:

- `node_modules`
- `.git`
- `__pycache__`
- `.next`
- `dist`
- `build`

## Error Handling

`route` never throws. On failure, it returns a `RouteResult` with an empty `content` string and error details in `warnings`:

```typescript
// Non-existent file
const result = await route("/path/to/missing-file.txt");
console.log(result.content);    // ""
console.log(result.warnings);   // ["Failed to read file: ENOENT: no such file or directory..."]

// Undetectable format (binary without magic bytes or hints)
const result2 = await route(Buffer.from([0x00, 0x01, 0x02]));
console.log(result2.warnings);  // ["Unable to detect file format. Provide a format hint..."]

// No parser for a detected format
const result3 = await route("content", { format: "unknown_format" });
console.log(result3.warnings);  // ["No parser registered for format: unknown_format"]
```

`routeBatch` isolates errors per file. Each `BatchRouteResult` has either a `result` or an `error`:

```typescript
const results = await routeBatch(["./valid.txt", "./missing.txt"]);
for (const r of results) {
  if (r.error) {
    console.error(`Failed: ${r.source} -- ${r.error}`);
  }
}
```

Invalid JSON content is still returned inside a code fence, with a parse warning:

```typescript
const result = await route("{broken json}", { format: "json" });
// result.content contains the raw text in a ```json fence
// result.warnings: ["Invalid JSON: ..."]
```

## Advanced Usage

### Overriding a Built-in Parser

Custom parsers registered via `registerParser` take priority over built-ins. To override how JSON is handled, for example:

```typescript
import { registerParser, route } from "ai-file-router";

registerParser({
  name: "compact-json",
  formats: ["json"],
  canParse: (input) => input.formatInfo.format === "json",
  parse: async (input) => {
    const text = typeof input.content === "string"
      ? input.content
      : input.content.toString("utf-8");
    const parsed = JSON.parse(text);
    const keys = Object.keys(parsed);
    return {
      content: `JSON object with ${keys.length} keys: ${keys.join(", ")}`,
      format: "text",
    };
  },
});

const result = await route('{"a":1,"b":2,"c":3}', { format: "json" });
// result.content: "JSON object with 3 keys: a, b, c"
```

### Pre-filtering with detectFormat

Use `detectFormat` to inspect files before committing to a full parse:

```typescript
import { detectFormat, route } from "ai-file-router";

const files = ["report.pdf", "data.csv", "image.png", "notes.md"];

for (const file of files) {
  const info = detectFormat({ filePath: file });
  if (info.format === "image" || info.confidence < 0.5) {
    console.log(`Skipping ${file} (${info.format}, confidence ${info.confidence})`);
    continue;
  }
  const result = await route(file);
  console.log(`${file}: ${result.metadata.wordCount} words`);
}
```

### Processing Buffers from HTTP Responses

```typescript
import { route } from "ai-file-router";

const response = await fetch("https://example.com/api/report.csv");
const buffer = Buffer.from(await response.arrayBuffer());

const result = await route(buffer, {
  mimeType: response.headers.get("content-type") || undefined,
  fileName: "report.csv",
});

console.log(result.sourceFormat); // "csv"
console.log(result.content);     // Markdown table
```

### Using a Standalone ParserRegistry

For isolated environments (tests, plugins), create a separate registry:

```typescript
import { ParserRegistry } from "ai-file-router";

const registry = new ParserRegistry();
console.log(registry.getSupportedFormats());
// All built-in formats are available

registry.register(myCustomParser);
const parser = registry.findParser(input);
```

## TypeScript

All types are exported from the package entry point:

```typescript
import type {
  RouteResult,
  RouteOptions,
  OutputFormat,
  FormatInfo,
  DetectionMethod,
  FileMetadata,
  Parser,
  ParserInput,
  ParserOutput,
  CodeOptions,
  BatchRouteResult,
  BatchOptions,
} from "ai-file-router";
```

The package is compiled with `strict: true` and ships declaration files (`.d.ts`) and declaration maps.

## License

MIT
