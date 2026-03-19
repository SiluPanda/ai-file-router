# ai-file-router -- Specification

## 1. Overview

`ai-file-router` is a unified file-type detection and parsing router that accepts any file -- PDF, DOCX, PPTX, HTML, CSV, XLSX, images, markdown, plain text, source code, JSON, YAML, or dozens of other formats -- auto-detects its format, routes it through the optimal parsing pipeline, and returns clean text or markdown suitable for AI consumption. It accepts a file path, Buffer, URL, or ReadableStream, determines the file format using magic bytes, MIME type, and file extension, selects a registered parser for that format, invokes the parser, post-processes the output, and returns a unified `RouteResult` containing the extracted content, output format indicator, source format metadata, and any warnings. The router supports single files, batches, and recursive directory scanning. Parsers are pluggable: built-in parsers handle common formats out of the box, `docling-node-ts` is used when available for high-quality document conversion, and callers can register custom parsers for additional or proprietary formats.

The gap this package fills is specific and well-defined. Every RAG (Retrieval-Augmented Generation) application must ingest files from heterogeneous sources. A user uploads a PDF, a Word document, a spreadsheet, a CSV, an image, a JSON config file, a Python script, and an HTML page. Each format requires a different parser: `pdfjs-dist` for PDFs, `mammoth` or `jszip` for DOCX, `xlsx` for Excel, `cheerio` for HTML, `tesseract.js` for images with OCR, `csv-parse` for CSVs, and raw `fs.readFile` for text and code files. The developer writes a large switch/case block or if/else chain that checks the file extension, selects the parser, calls it, normalizes the output, and handles errors -- for every format. This boilerplate is repeated in every RAG application, every document processing API, every file upload handler, and every knowledge base builder. The logic is always the same: detect the format, pick a parser, parse, normalize the output to text or markdown. Yet no npm package provides this unified routing.

The Python ecosystem has solutions: LangChain's document loaders provide format-specific loaders behind a common interface, Unstructured provides a unified `partition()` function that detects format and routes to the appropriate parser, and LlamaIndex has `SimpleDirectoryReader` that walks a directory and uses format-appropriate readers. The JavaScript ecosystem has nothing comparable. The `textract` npm package (last published 2018) attempts this but shells out to system commands (`pdftotext`, `antiword`, `catdoc`) that must be installed separately, does not produce markdown, does not support modern formats, and is effectively abandoned. Developers building RAG pipelines in Node.js either cobble together their own routing logic or use a Python sidecar for document ingestion.

`ai-file-router` eliminates this gap. A single `route()` call accepts any supported file and returns clean text or markdown. A `routeBatch()` call processes multiple files in parallel with configurable concurrency. A `routeDirectory()` call recursively scans a directory, detects every file's format, and processes them all. The router is extensible: `router.register('dwg', myDwgParser)` adds support for a proprietary format with a single line. The router integrates naturally with the npm-master ecosystem: `docling-node-ts` provides high-quality parsing for PDF, DOCX, PPTX, and HTML when installed; `chunk-smart` chunks the router's output for embedding; `embed-cache` caches the embeddings; `rag-prompt-builder` composes the final RAG prompt. The canonical pipeline is `ai-file-router` (route any file to text/markdown) then `chunk-smart` (chunk) then `embed-cache` (embed) then `rag-prompt-builder` (compose).

The package provides both a TypeScript/JavaScript API for programmatic use and a CLI for converting files from the terminal. The API returns structured `RouteResult` objects with the content string, output format, source format, metadata, and warnings. The CLI reads files or directories and writes text or markdown to stdout or files. Both interfaces support format override, output format preference, parser selection, OCR configuration, and concurrency settings.

---

## 2. Goals and Non-Goals

### Goals

- Provide a single function (`route`) that accepts a file input (file path, Buffer, URL, or ReadableStream), auto-detects the format, parses it with the optimal parser, and returns a `RouteResult` containing clean text or markdown, source format metadata, and warnings.
- Provide a batch function (`routeBatch`) that processes multiple files in parallel with configurable concurrency, per-file error handling, and aggregated results.
- Provide a directory function (`routeDirectory`) that recursively scans a directory, detects all files, and routes each through the appropriate parser, returning results for every file.
- Provide a detection function (`detectFormat`) that determines a file's format without parsing it, returning format identification, confidence score, and detection method.
- Provide a factory function (`createRouter`) that creates a configured router instance with preset options, custom parser registrations, and default settings that apply to all subsequent `route` calls.
- Support format detection via three mechanisms in priority order: magic bytes (file signatures), MIME type (if provided by the caller), and file extension. Magic bytes are the most reliable; extensions are the least reliable but the most convenient.
- Support at minimum 30 file formats across seven categories: documents (PDF, DOCX, PPTX, ODT, RTF), spreadsheets (XLSX, CSV, TSV), web (HTML, XML), markup (Markdown, reStructuredText), data (JSON, YAML, TOML), code (JavaScript, TypeScript, Python, Rust, Go, Java, C, C++, Ruby, Shell, SQL, PHP, Swift, Kotlin, and others via extension mapping), images (PNG, JPEG, GIF, WEBP, TIFF, BMP, SVG), and plain text (TXT, LOG).
- Integrate with `docling-node-ts` when it is installed, using it as the primary parser for PDF, DOCX, PPTX, and HTML. Fall back to lightweight built-in parsers when `docling-node-ts` is not available.
- Allow custom parser registration: `router.register(format, parserFn)` adds or overrides a parser for a given format. Custom parsers take highest priority over built-in and docling-node-ts parsers.
- Produce unified output: regardless of input format, the output is always a clean string -- either markdown (for structured documents) or plain text (for unstructured content). The output is immediately suitable for chunking by `chunk-smart` and embedding.
- Provide a CLI (`ai-file-router`) that converts files or directories to text/markdown from the command line, supporting batch processing and configurable output.
- Produce deterministic output: the same input with the same options always produces the same result. No LLM calls, no network access during parsing (except for URL input fetching), no non-determinism.
- Target Node.js 18 and above.

### Non-Goals

- **Not a document converter.** This package routes files to parsers and returns the parser's output in a unified wrapper. The heavy lifting of document conversion (PDF layout analysis, DOCX XML traversal, PPTX slide parsing) is performed by `docling-node-ts` or by lightweight built-in fallbacks. `ai-file-router` does not reimplement `docling-node-ts`. It delegates to it.
- **Not a file format validator.** This package detects file formats for the purpose of routing to the correct parser. It does not validate whether a file conforms to its format's specification. A corrupted PDF that starts with `%PDF` will be detected as PDF and sent to the PDF parser; the parser will report the error.
- **Not a content extraction AI.** This package uses rule-based parsing, not machine learning. It does not use LLMs to interpret document structure, extract entities, or summarize content. For AI-powered content extraction, use dedicated services after routing.
- **Not a file storage or management system.** This package reads files and produces text output. It does not manage file uploads, store files, track file versions, or provide a file system abstraction.
- **Not a web scraper.** This package can parse HTML content, but it does not fetch web pages, follow links, execute JavaScript, or handle authentication. For web scraping, use Puppeteer or Playwright and pass the resulting HTML to the router.
- **Not a chunking library.** This package produces text or markdown from files. Splitting that output into chunks for embedding is the responsibility of `chunk-smart`. The canonical pipeline is: `ai-file-router` (route) then `chunk-smart` (chunk) then `embed-cache` (embed).
- **Not a LangChain integration.** This package is framework-independent. It returns plain strings and typed objects. Wrapping the output into LangChain `Document` objects is trivial and left to the caller.
- **Not an OCR engine.** Optional OCR for images is available via `tesseract.js` as a peer dependency. OCR accuracy and language support are delegated entirely to Tesseract. For production OCR, consider dedicated OCR services.

---

## 3. Target Users and Use Cases

### RAG Pipeline Builders

Developers constructing retrieval-augmented generation pipelines who need to ingest files from diverse sources -- a user uploads a PDF, a coworker shares a Word document, a data team exports a CSV, an engineer commits a Python script, a designer shares an image with text. Each file must be converted to text for embedding. Without `ai-file-router`, the developer writes and maintains a format detection and parser routing layer. With it, a single `route(file)` call handles everything. A typical integration is: `const { content } = await route('./quarterly-report.pdf'); const chunks = chunk(content, { maxChunkSize: 512 });`.

### Document Processing APIs

Backend engineers building document processing endpoints -- an API that accepts file uploads, converts them to text, chunks them, embeds them, and stores vectors. The API receives files in arbitrary formats from end users. The engineer cannot predict whether the upload will be a PDF, DOCX, PNG, or CSV. `ai-file-router` provides the unified entrypoint that handles format detection and routing, eliminating the switch/case block in the upload handler.

### Knowledge Base Construction

Teams building internal knowledge bases that ingest corporate documents from file shares, SharePoint, Google Drive, or S3 buckets. The file collection is heterogeneous: policy manuals in PDF, meeting notes in DOCX, financial data in XLSX, architecture diagrams as images, configuration files in YAML, scripts in Python, and READMEs in Markdown. `routeDirectory('./knowledge-base/')` processes every file in the directory and produces text output ready for embedding.

### File Upload Handlers

Full-stack developers building applications with file upload features where uploaded files must be processed for search, preview, or AI analysis. The upload handler calls `route(buffer, { mimeType: req.headers['content-type'] })` to convert the uploaded file to text, regardless of what format the user uploaded.

### CLI Batch Processing

Engineers who need to convert a directory of mixed-format files to text or markdown for bulk processing, migration, or archival. `ai-file-router ./docs/ --output-dir ./text/ --recursive` processes every file in the directory tree and writes the text output to corresponding files.

### Integration with npm-master Ecosystem

Developers using other packages in the npm-master monorepo. `ai-file-router` is the entrypoint of the document ingestion pipeline: it routes files to the appropriate parser (delegating to `docling-node-ts` for complex documents), produces the text/markdown that `chunk-smart` chunks, `embed-cache` embeds, `context-packer` packs into LLM context windows, and `rag-prompt-builder` composes into prompts. It is the "front door" that normalizes the messy reality of heterogeneous file formats into the clean text that the rest of the pipeline expects.

---

## 4. Core Concepts

### File Router

The file router is the central abstraction. It maintains a registry of parsers keyed by format identifier and a detection engine that determines the format of an input. When `route(input)` is called, the router detects the format, looks up the parser in the registry, invokes the parser, post-processes the output, and returns a `RouteResult`. The router is stateless -- each `route()` call is independent. The `createRouter()` factory produces a configured router instance with preset options and registered parsers that can be reused across calls.

### Format Detection

Format detection determines the file type of an input so the correct parser can be selected. Detection uses three signals in priority order: (1) explicit format specification by the caller (`options.format`), (2) magic bytes (the first bytes of the file content that identify the format), (3) MIME type (if provided by the caller as `options.mimeType`), (4) file extension (extracted from file path or URL). Magic bytes are more reliable than extensions because files can have incorrect or missing extensions. MIME types are more reliable than extensions but less available (they require HTTP headers or OS metadata). The detection engine returns a `FormatInfo` object with the detected format, confidence score, and detection method.

### Parser

A parser is a function that accepts a file input and options and returns parsed content as a string (text or markdown). Parsers are format-specific: the PDF parser extracts text from PDFs, the CSV parser converts tabular data to markdown tables, the code parser wraps source code in fenced code blocks. Parsers are registered in the parser registry and selected by the router based on the detected format. A parser function has the signature `(input: ParserInput, options: ParserOptions) => Promise<ParserOutput>`.

### Parser Registry

The parser registry maps format identifiers to parser functions. It maintains three tiers of parsers in priority order: (1) custom parsers registered by the caller via `router.register()`, (2) `docling-node-ts` parsers for formats that `docling-node-ts` supports (PDF, DOCX, PPTX, HTML), detected by checking whether `docling-node-ts` is installed, (3) built-in fallback parsers that ship with `ai-file-router`. When a format is routed, the registry returns the highest-priority parser available for that format.

### Unified Output

Regardless of input format, the router always returns a `RouteResult` with a `content` string and a `format` indicator (`'markdown'` or `'text'`). Structured documents (PDF, DOCX, PPTX, HTML, XLSX, CSV) produce markdown output with headings, tables, lists, and formatting preserved. Unstructured content (plain text, log files) produces text output. Source code produces markdown output (wrapped in fenced code blocks with language tags). Images produce text output (OCR-extracted text or a placeholder). The unified output can be fed directly to `chunk-smart` without the caller needing to know what format the original file was.

### Route Result

The `RouteResult` is the output of every `route()` call. It carries the extracted content string, the output format indicator, the detected source format, document metadata (title, author, word count, file size), processing duration, and any warnings generated during parsing. `RouteResult` objects are immediately serializable with `JSON.stringify` and immediately usable in downstream pipelines.

---

## 5. Format Detection

Format detection is the first stage of the routing pipeline. It determines the file type so the correct parser can be selected. Accurate detection is critical: routing a DOCX file to the plain text parser produces garbage; routing a plain text file to the PDF parser produces an error.

### 5.1 Detection Priority

Detection uses four signals. When multiple signals are available, they are evaluated in this priority order, and the highest-confidence result wins:

1. **Explicit format**: If the caller provides `options.format`, that format is used directly with confidence `1.0`. No detection is performed.
2. **Magic bytes** (file signatures): The first N bytes of the file content are compared against known file signatures. This is the most reliable detection method because it examines the actual file content, not metadata. Confidence is `1.0` for unambiguous signatures (PDF, PNG, JPEG) and `0.9` for signatures that require secondary disambiguation (ZIP-based formats like DOCX/PPTX/XLSX).
3. **MIME type**: If the caller provides `options.mimeType` (e.g., from an HTTP `Content-Type` header or OS file metadata), the MIME type is mapped to a format identifier. Confidence is `0.8` because MIME types can be incorrect (servers misconfigure content types, and `application/octet-stream` is meaningless).
4. **File extension**: If the input is a file path or URL, the extension is extracted and mapped to a format identifier. Confidence is `0.6` because extensions can be wrong (a `.txt` file that is actually JSON, a `.doc` file that is actually DOCX, a file with no extension).

When multiple signals agree, confidence is boosted to the maximum. When signals disagree (e.g., magic bytes say PDF but extension says `.txt`), the higher-priority signal wins.

### 5.2 Magic Bytes (File Signatures)

Magic bytes are the most reliable detection mechanism. The following file signatures are checked:

| Format | Magic Bytes (hex) | Magic Bytes (ASCII) | Offset | Notes |
|--------|-------------------|---------------------|--------|-------|
| PDF | `25 50 44 46` | `%PDF` | 0 | Unambiguous. |
| ZIP | `50 4B 03 04` | `PK..` | 0 | Ambiguous: DOCX, PPTX, XLSX, ODT, JAR, and generic ZIP all use this signature. Requires secondary disambiguation. |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | `.PNG....` | 0 | Unambiguous. |
| JPEG | `FF D8 FF` | | 0 | Unambiguous. |
| GIF | `47 49 46 38` | `GIF8` | 0 | Unambiguous. Followed by `37 61` (GIF87a) or `39 61` (GIF89a). |
| WEBP | `52 49 46 46 ?? ?? ?? ?? 57 45 42 50` | `RIFF....WEBP` | 0 | Bytes 0-3 are `RIFF`, bytes 8-11 are `WEBP`. |
| TIFF | `49 49 2A 00` or `4D 4D 00 2A` | `II*.` or `MM.*` | 0 | Little-endian or big-endian TIFF. |
| BMP | `42 4D` | `BM` | 0 | Unambiguous. |
| RTF | `7B 5C 72 74 66` | `{\rtf` | 0 | Unambiguous. |
| GZIP | `1F 8B` | | 0 | Compressed file. Not directly parsed; noted for future decompression support. |

### 5.3 ZIP-Based Format Disambiguation

DOCX, PPTX, XLSX, and ODT are all ZIP archives with the `PK` signature. Disambiguation requires reading the ZIP's `[Content_Types].xml` file to identify the Office document type:

| Content Type in `[Content_Types].xml` | Detected Format |
|---------------------------------------|-----------------|
| `application/vnd.openxmlformats-officedocument.wordprocessingml` | DOCX |
| `application/vnd.openxmlformats-officedocument.presentationml` | PPTX |
| `application/vnd.openxmlformats-officedocument.spreadsheetml` | XLSX |
| `application/vnd.oasis.opendocument.text` | ODT |
| `application/vnd.oasis.opendocument.spreadsheet` | ODS |
| None of the above | Generic ZIP (treated as unsupported) |

If the ZIP cannot be read (corrupted archive), the detection falls back to extension-based detection. If neither works, the format is reported as `'unknown'` and the router returns an error.

### 5.4 Extension Mapping

File extension mapping covers all supported formats:

| Extension(s) | Detected Format |
|-------------|-----------------|
| `.pdf` | `pdf` |
| `.docx` | `docx` |
| `.doc` | `doc` (legacy Word -- unsupported, warning emitted) |
| `.pptx` | `pptx` |
| `.ppt` | `ppt` (legacy PowerPoint -- unsupported, warning emitted) |
| `.xlsx` | `xlsx` |
| `.xls` | `xls` (legacy Excel -- unsupported, warning emitted) |
| `.csv` | `csv` |
| `.tsv` | `tsv` |
| `.html`, `.htm` | `html` |
| `.xml` | `xml` |
| `.md`, `.markdown` | `markdown` |
| `.rst` | `rst` |
| `.json` | `json` |
| `.yaml`, `.yml` | `yaml` |
| `.toml` | `toml` |
| `.txt` | `text` |
| `.log` | `text` |
| `.rtf` | `rtf` |
| `.odt` | `odt` |
| `.js`, `.mjs`, `.cjs` | `code` (language: `javascript`) |
| `.ts`, `.mts`, `.cts` | `code` (language: `typescript`) |
| `.jsx`, `.tsx` | `code` (language: `typescript`) |
| `.py`, `.pyw` | `code` (language: `python`) |
| `.rs` | `code` (language: `rust`) |
| `.go` | `code` (language: `go`) |
| `.java` | `code` (language: `java`) |
| `.c`, `.h` | `code` (language: `c`) |
| `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hxx` | `code` (language: `cpp`) |
| `.cs` | `code` (language: `csharp`) |
| `.rb` | `code` (language: `ruby`) |
| `.php` | `code` (language: `php`) |
| `.swift` | `code` (language: `swift`) |
| `.kt`, `.kts` | `code` (language: `kotlin`) |
| `.scala` | `code` (language: `scala`) |
| `.sh`, `.bash`, `.zsh` | `code` (language: `bash`) |
| `.sql` | `code` (language: `sql`) |
| `.r`, `.R` | `code` (language: `r`) |
| `.lua` | `code` (language: `lua`) |
| `.pl`, `.pm` | `code` (language: `perl`) |
| `.ex`, `.exs` | `code` (language: `elixir`) |
| `.erl` | `code` (language: `erlang`) |
| `.hs` | `code` (language: `haskell`) |
| `.dart` | `code` (language: `dart`) |
| `.vue` | `code` (language: `vue`) |
| `.svelte` | `code` (language: `svelte`) |
| `.css` | `code` (language: `css`) |
| `.scss`, `.sass` | `code` (language: `scss`) |
| `.less` | `code` (language: `less`) |
| `.graphql`, `.gql` | `code` (language: `graphql`) |
| `.proto` | `code` (language: `protobuf`) |
| `.tf` | `code` (language: `hcl`) |
| `.dockerfile`, `Dockerfile` | `code` (language: `dockerfile`) |
| `.makefile`, `Makefile` | `code` (language: `makefile`) |
| `.png` | `image` (subtype: `png`) |
| `.jpg`, `.jpeg` | `image` (subtype: `jpeg`) |
| `.gif` | `image` (subtype: `gif`) |
| `.webp` | `image` (subtype: `webp`) |
| `.tiff`, `.tif` | `image` (subtype: `tiff`) |
| `.bmp` | `image` (subtype: `bmp`) |
| `.svg` | `image` (subtype: `svg`) |

### 5.5 MIME Type Mapping

Common MIME types are mapped to format identifiers:

| MIME Type | Detected Format |
|-----------|-----------------|
| `application/pdf` | `pdf` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `docx` |
| `application/vnd.openxmlformats-officedocument.presentationml.presentation` | `pptx` |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `xlsx` |
| `text/html` | `html` |
| `text/xml`, `application/xml` | `xml` |
| `text/markdown` | `markdown` |
| `text/csv` | `csv` |
| `text/tab-separated-values` | `tsv` |
| `application/json` | `json` |
| `text/yaml`, `application/x-yaml` | `yaml` |
| `text/plain` | `text` |
| `application/rtf` | `rtf` |
| `image/png` | `image` (subtype: `png`) |
| `image/jpeg` | `image` (subtype: `jpeg`) |
| `image/gif` | `image` (subtype: `gif`) |
| `image/webp` | `image` (subtype: `webp`) |
| `image/tiff` | `image` (subtype: `tiff`) |
| `image/bmp` | `image` (subtype: `bmp`) |
| `image/svg+xml` | `image` (subtype: `svg`) |
| `application/octet-stream` | Ignored (not informative). Fall through to other signals. |

### 5.6 Ambiguous and Legacy Formats

Some formats require special handling:

- **`.doc` (legacy Word)**: The legacy binary Word format is not supported for full conversion. Detection identifies it and emits a warning recommending conversion to `.docx`. If a built-in or custom parser is registered for `doc`, it is used; otherwise, the router returns an error with code `UNSUPPORTED_FORMAT`.
- **`.xls` (legacy Excel)**: Same treatment as `.doc`.
- **`.ppt` (legacy PowerPoint)**: Same treatment.
- **ZIP files that are not Office documents**: A ZIP file that does not contain `[Content_Types].xml` is not a recognized Office format. The router returns an error or falls back to extension-based detection.
- **Text-based formats without extensions**: A Buffer with no extension and no magic bytes (no binary signature) is treated as plain text. Heuristic content inspection (checking for JSON braces, HTML tags, YAML indicators, markdown headers) is applied as a secondary detection step with confidence `0.5`.

---

## 6. Supported Formats

### 6.1 Documents

#### PDF

**Parser**: `docling-node-ts` (primary), `pdf-parse` (fallback).

**Output**: Markdown with headings, tables, lists, code blocks, and image references preserved. When using `docling-node-ts`, output quality includes layout analysis, multi-column detection, header/footer removal, and heading detection from font metrics. When using the `pdf-parse` fallback, output is raw extracted text with no structural analysis.

**Quality**: High with `docling-node-ts`, low with fallback.

**Optional dependencies**: `docling-node-ts` (peer), `pdf-parse` (bundled fallback).

#### DOCX

**Parser**: `docling-node-ts` (primary), `mammoth` (fallback).

**Output**: Markdown with headings from Word styles, formatted lists, tables, images, and inline formatting. When using `docling-node-ts`, output includes full style-to-heading mapping, merged cell handling, footnotes, and image extraction. When using `mammoth`, output is HTML that the router converts to markdown via built-in HTML-to-markdown conversion.

**Quality**: High with `docling-node-ts`, moderate with fallback.

**Optional dependencies**: `docling-node-ts` (peer), `mammoth` (bundled fallback).

#### PPTX

**Parser**: `docling-node-ts` (primary), built-in PPTX parser (fallback).

**Output**: Markdown with per-slide sections (`## Slide N: Title`), extracted text boxes, tables, and optional speaker notes. The fallback parser uses `jszip` to read slide XML and extract text content without full layout analysis.

**Quality**: High with `docling-node-ts`, moderate with fallback.

**Optional dependencies**: `docling-node-ts` (peer), `jszip` (bundled for fallback).

#### ODT

**Parser**: Built-in ODT parser.

**Output**: Markdown with headings, paragraphs, lists, and tables extracted from the ODF XML structure. ODT files are ZIP archives containing `content.xml` with ODF-format element names.

**Quality**: Moderate. Basic structural elements are preserved; complex formatting (frames, draw objects) is simplified or omitted.

**Dependencies**: `jszip` (bundled for ZIP extraction).

#### RTF

**Parser**: Built-in RTF parser.

**Output**: Plain text extracted from the RTF control word structure. RTF is a complex format; the built-in parser handles basic text extraction, paragraph breaks, and simple formatting (bold, italic) but does not reconstruct tables or images.

**Quality**: Low to moderate. Suitable for extracting text content; structural elements may be lost.

**Dependencies**: None (hand-written parser).

### 6.2 Spreadsheets

#### XLSX

**Parser**: Built-in XLSX parser using `xlsx` (SheetJS).

**Output**: Markdown with one GFM table per worksheet. Each worksheet becomes a section headed by the sheet name (`## Sheet: Sheet1`). The first row is treated as the header row. Cell values are formatted as strings. Formulas are evaluated to their cached values.

**Quality**: High for tabular data. Charts, pivot tables, and conditional formatting are ignored.

**Dependencies**: `xlsx` (SheetJS Community Edition, bundled).

#### CSV

**Parser**: Built-in CSV parser.

**Output**: Markdown GFM table. The first row is treated as the header row (configurable). Commas within quoted fields, escaped quotes, and multiline fields are handled correctly per RFC 4180.

**Quality**: High. CSV is a simple format; parsing is reliable.

**Dependencies**: None (hand-written parser following RFC 4180).

#### TSV

**Parser**: Built-in TSV parser (same as CSV with tab delimiter).

**Output**: Markdown GFM table, same as CSV.

**Quality**: High.

**Dependencies**: None.

### 6.3 Web

#### HTML

**Parser**: `docling-node-ts` (primary), built-in HTML parser using `cheerio` (fallback).

**Output**: Markdown with headings, paragraphs, lists, tables, code blocks, links, images, and inline formatting. Readability-based article extraction strips navigation, ads, sidebars, and scripts. The fallback parser uses `cheerio` with a lightweight readability algorithm to extract the main content and convert HTML elements to markdown.

**Quality**: High with `docling-node-ts`, good with fallback.

**Optional dependencies**: `docling-node-ts` (peer), `cheerio` (bundled for fallback).

#### XML

**Parser**: Built-in XML parser.

**Output**: Formatted text representation of the XML structure. Element tags are preserved as readable text. Attributes are included. The output is not markdown tables or headings -- it is a clean, indented text representation of the XML tree suitable for LLM consumption.

**Quality**: Good. The XML structure is preserved in a human-readable format.

**Dependencies**: None (uses Node.js built-in XML parsing or a lightweight SAX parser).

### 6.4 Markup

#### Markdown

**Parser**: Built-in passthrough.

**Output**: The input markdown, cleaned up with normalized whitespace, consistent line endings, and removed trailing spaces. No structural transformation is applied -- markdown is already in the target format.

**Quality**: Perfect (passthrough with cleanup).

**Dependencies**: None.

#### reStructuredText

**Parser**: Built-in RST parser.

**Output**: Markdown converted from RST syntax. Headings (RST uses underline-based headings) are converted to ATX-style markdown headings. Code blocks, lists, tables (RST grid and simple table syntax), and inline formatting are mapped to their markdown equivalents.

**Quality**: Moderate. Common RST constructs are handled; complex directives (e.g., `.. toctree::`, `.. image::`, `.. note::`) are converted to best-effort markdown equivalents or preserved as text.

**Dependencies**: None (hand-written RST-to-markdown converter).

### 6.5 Data Formats

#### JSON

**Parser**: Built-in JSON parser.

**Output**: The JSON content pretty-printed with 2-space indentation, wrapped in a markdown fenced code block with the `json` language tag. For small JSON files (configurable threshold, default 10KB), the entire content is wrapped. For large JSON files, the structure is summarized: top-level keys are listed, arrays show their length, and deeply nested structures are truncated with `...`.

**Quality**: High. JSON is self-describing and perfectly parseable.

**Dependencies**: None (uses built-in `JSON.parse` and `JSON.stringify`).

#### YAML

**Parser**: Built-in YAML parser.

**Output**: The YAML content wrapped in a markdown fenced code block with the `yaml` language tag. Multi-document YAML files (separated by `---`) are preserved. Like JSON, large files are summarized rather than included verbatim.

**Quality**: High.

**Dependencies**: None (YAML is passed through as-is in a code fence; no YAML parsing library is needed since the goal is text representation, not data extraction).

#### TOML

**Parser**: Built-in TOML parser.

**Output**: The TOML content wrapped in a markdown fenced code block with the `toml` language tag.

**Quality**: High.

**Dependencies**: None (passthrough in code fence).

### 6.6 Code Files

#### All Supported Languages

**Parser**: Built-in code file parser.

**Output**: The source code wrapped in a markdown fenced code block with the appropriate language tag. The language tag is determined from the file extension using the extension mapping table in Section 5.4. The output preserves the original indentation, whitespace, and formatting of the source code.

**Format**:

````markdown
```typescript
import { route } from 'ai-file-router';

async function processFile(path: string) {
  const result = await route(path);
  console.log(result.content);
}
```
````

**Additional features**:

- **Comment extraction** (optional, `codeOptions.extractComments: true`): In addition to wrapping the full source in a code fence, extract block comments (`/* ... */`, `""" ... """`, `# ...`) and emit them as a separate section before the code block. This is useful for RAG pipelines that want to index documentation comments separately from code.
- **File metadata header**: Optionally prepend a metadata header with the file name and language: `## File: src/index.ts (TypeScript)`.

**Quality**: Perfect (passthrough with code fence wrapping).

**Dependencies**: None.

### 6.7 Images

#### PNG, JPEG, GIF, WEBP, TIFF, BMP

**Parser**: Built-in image parser with optional OCR.

**Output (with OCR)**: Plain text extracted from the image via `tesseract.js`. The text is cleaned up (whitespace normalized, stray characters removed) and returned as plain text.

**Output (without OCR)**: A placeholder string: `[Image: filename.png (800x600, 245KB)]`. The placeholder includes the filename, dimensions (if detectable from the image header without full decoding), and file size. This placeholder is informative enough for an LLM to understand that an image was present.

**Quality**: Depends entirely on OCR quality (for OCR mode) or minimal (for placeholder mode).

**Optional dependencies**: `tesseract.js` (peer dependency, required only when OCR is enabled).

#### SVG

**Parser**: Built-in SVG parser.

**Output**: Text content extracted from `<text>`, `<tspan>`, and `<title>` elements within the SVG. If the SVG contains no text elements, a placeholder `[SVG Image: filename.svg]` is returned.

**Quality**: Good for text-heavy SVGs (diagrams with labels, charts). Minimal for purely graphical SVGs.

**Dependencies**: None (uses regex-based text extraction from SVG XML, or `cheerio` if available).

### 6.8 Plain Text

#### TXT, LOG

**Parser**: Built-in text passthrough.

**Output**: The file content as-is, with normalized line endings (CRLF converted to LF), trailing whitespace removed, and the file terminated with a single newline.

**Quality**: Perfect (passthrough with cleanup).

**Dependencies**: None.

---

## 7. Parser Registry

The parser registry is the mechanism that maps format identifiers to parser functions. It determines which parser handles each format and in what priority order.

### 7.1 Registry Structure

The registry is a `Map<string, ParserEntry[]>` where the key is a format identifier (e.g., `'pdf'`, `'docx'`, `'csv'`, `'code'`) and the value is an ordered list of parser entries. Each entry has a priority, a parser function, and a label:

```typescript
interface ParserEntry {
  priority: 'custom' | 'docling' | 'builtin';
  parser: ParserFn;
  label: string;
}
```

When a format is routed, the registry returns the entry with the highest priority. Priority order: `custom` > `docling` > `builtin`.

### 7.2 Built-in Parsers

Built-in parsers are registered at router creation time for all supported formats. They provide baseline functionality that works without any optional dependencies:

| Format | Built-in Parser | Approach |
|--------|----------------|----------|
| `pdf` | `pdf-parse` wrapper | Raw text extraction, no layout analysis |
| `docx` | `mammoth` wrapper | Convert to HTML, then HTML to markdown |
| `pptx` | `jszip` + XML reader | Extract text from slide XML |
| `html` | `cheerio` + readability | Article extraction and tag mapping |
| `xlsx` | `xlsx` (SheetJS) wrapper | Sheet-to-table conversion |
| `csv` | RFC 4180 parser | Parse and convert to markdown table |
| `tsv` | Tab-delimited parser | Same as CSV with tab separator |
| `json` | `JSON.parse` + pretty-print | Code fence wrapper |
| `yaml` | Passthrough | Code fence wrapper |
| `toml` | Passthrough | Code fence wrapper |
| `xml` | Built-in XML reader | Formatted text representation |
| `markdown` | Passthrough + cleanup | Whitespace normalization |
| `rst` | RST-to-markdown converter | Heading and syntax conversion |
| `rtf` | RTF text extractor | Basic text extraction |
| `odt` | `jszip` + ODF XML reader | Structural element extraction |
| `code` | Code fence wrapper | Language-tagged code block |
| `image` | Placeholder or OCR | `[Image: ...]` or `tesseract.js` |
| `text` | Passthrough + cleanup | Line ending normalization |

### 7.3 docling-node-ts Integration

When `docling-node-ts` is installed as a peer dependency, the router detects its availability at creation time using a dynamic `import()` call wrapped in a try/catch. If available, `docling-node-ts` parsers are registered for `pdf`, `docx`, `pptx`, and `html` with priority `'docling'`, which sits between `custom` and `builtin`. This means `docling-node-ts` is automatically used for these formats unless the caller has registered a custom parser.

Detection is performed once at router creation and cached. The router does not attempt to import `docling-node-ts` on every `route()` call.

```typescript
// Internal detection at router creation
let doclingAvailable = false;
try {
  await import('docling-node-ts');
  doclingAvailable = true;
} catch {
  // docling-node-ts not installed; use built-in parsers
}
```

When `docling-node-ts` is used, its `convert()` function is called and the resulting `markdown` string from the `ConversionResult` is used as the `content` of the `RouteResult`. Metadata from `ConversionResult.metadata` is merged into `RouteResult.metadata`.

### 7.4 Custom Parser Registration

Callers register custom parsers via `router.register()`:

```typescript
const router = createRouter();

router.register('dwg', async (input, options) => {
  const text = await myDwgParser(input);
  return { content: text, format: 'text' };
});

router.register('pdf', async (input, options) => {
  // Override the default PDF parser with a custom one
  const markdown = await myBetterPdfParser(input);
  return { content: markdown, format: 'markdown' };
});
```

Custom parsers are registered with priority `'custom'`, which overrides both `docling` and `builtin` parsers. Registering a parser for a format that already has a custom parser replaces the previous custom parser.

Custom parsers must conform to the `ParserFn` signature:

```typescript
type ParserFn = (
  input: ParserInput,
  options: ParserOptions,
) => Promise<ParserOutput>;

interface ParserInput {
  buffer: Buffer;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
}

interface ParserOutput {
  content: string;
  format: 'markdown' | 'text';
  metadata?: Record<string, unknown>;
  warnings?: string[];
}
```

### 7.5 Parser Selection Logic

When `route()` is called and the format is detected, the parser is selected as follows:

1. Look up the format in the registry.
2. If entries exist, sort by priority (`custom` > `docling` > `builtin`).
3. Return the highest-priority entry's parser function.
4. If no entries exist for the format, throw `UnsupportedFormatError`.

```
route(input)
  │
  ├── detectFormat(input) → 'pdf'
  │
  ├── registry.get('pdf')
  │     → [{ priority: 'custom', parser: myPdfParser },
  │        { priority: 'docling', parser: doclingPdfParser },
  │        { priority: 'builtin', parser: pdfParseFallback }]
  │
  └── select highest priority → myPdfParser
```

---

## 8. Unified Output

### 8.1 RouteResult

Every `route()` call returns a `RouteResult`:

```typescript
interface RouteResult {
  /** The extracted content as clean text or markdown. */
  content: string;

  /** The output format: 'markdown' for structured content, 'text' for unstructured. */
  outputFormat: 'markdown' | 'text';

  /** The detected source format. */
  sourceFormat: string;

  /** The detection method and confidence. */
  detection: FormatInfo;

  /** Document metadata extracted during parsing. */
  metadata: DocumentMetadata;

  /** Warnings generated during detection or parsing (non-fatal issues). */
  warnings: RouteWarning[];

  /** Time taken for the entire route (detection + parsing + post-processing) in ms. */
  durationMs: number;

  /** The parser that was used (label string, e.g., 'docling-node-ts', 'pdf-parse', 'custom'). */
  parserUsed: string;
}
```

### 8.2 Output Format by Source Format

| Source Format | Output Format | Content Description |
|---------------|--------------|---------------------|
| PDF | `markdown` | Headings, paragraphs, tables, lists, code blocks, image references |
| DOCX | `markdown` | Headings, paragraphs, tables, lists, inline formatting |
| PPTX | `markdown` | Per-slide sections with text, tables, notes |
| HTML | `markdown` | Article content with headings, lists, tables, links |
| XLSX | `markdown` | Per-sheet tables with headers |
| CSV / TSV | `markdown` | Single table with header row |
| XML | `text` | Formatted, indented XML text |
| JSON | `markdown` | Pretty-printed JSON in a code fence |
| YAML | `markdown` | YAML content in a code fence |
| TOML | `markdown` | TOML content in a code fence |
| Markdown | `markdown` | Cleaned-up passthrough |
| RST | `markdown` | Converted RST-to-markdown |
| RTF | `text` | Extracted plain text |
| ODT | `markdown` | Headings, paragraphs, tables |
| Code files | `markdown` | Source in a language-tagged code fence |
| Images (OCR) | `text` | OCR-extracted text |
| Images (no OCR) | `text` | Placeholder `[Image: ...]` |
| Plain text | `text` | Cleaned-up passthrough |

### 8.3 DocumentMetadata

```typescript
interface DocumentMetadata {
  /** Original file name, if available. */
  fileName?: string;

  /** File size in bytes. */
  fileSize?: number;

  /** Document title, if extractable. */
  title?: string;

  /** Document author(s), if extractable. */
  author?: string;

  /** Document creation date, if extractable. */
  createdDate?: string;

  /** Document modification date, if extractable. */
  modifiedDate?: string;

  /** Number of pages or slides, if applicable. */
  pageCount?: number;

  /** Word count of the extracted content. */
  wordCount: number;

  /** Character count of the extracted content. */
  charCount: number;

  /** For code files: the detected programming language. */
  language?: string;

  /** For images: dimensions in pixels. */
  dimensions?: { width: number; height: number };

  /** For spreadsheets: sheet names. */
  sheetNames?: string[];

  /** Parser-specific metadata. */
  extra?: Record<string, unknown>;
}
```

### 8.4 RouteWarning

```typescript
interface RouteWarning {
  /** Warning code for programmatic handling. */
  code: string;

  /** Human-readable warning message. */
  message: string;
}
```

Warning codes:

| Code | Meaning |
|------|---------|
| `FALLBACK_PARSER` | `docling-node-ts` not available; using built-in fallback parser. Quality may be lower. |
| `LEGACY_FORMAT` | Legacy format detected (`.doc`, `.xls`, `.ppt`). Consider converting to the modern equivalent. |
| `NO_TEXT_EXTRACTED` | The parser produced no text content. The file may be empty, image-only, or corrupted. |
| `OCR_UNAVAILABLE` | Image file detected but OCR is disabled or `tesseract.js` is not installed. Returning placeholder. |
| `PARTIAL_PARSE` | Some content could not be parsed. The result may be incomplete. |
| `LARGE_FILE` | File exceeds the recommended size threshold. Processing may be slow. |
| `ENCODING_ISSUE` | Non-UTF-8 encoding detected. Content was converted with possible character loss. |

### 8.5 Clean Text Guarantees

The `content` string in every `RouteResult` is guaranteed to be:

- **UTF-8 encoded** with no byte-order mark.
- **Free of null bytes** and control characters (except `\n` and `\t`).
- **Free of excessive whitespace** (no more than two consecutive blank lines, no trailing whitespace on lines).
- **Terminated with a single newline**.
- **Non-empty** for successfully parsed files (if the file has extractable content). When no content is extractable, `content` is an empty string and a `NO_TEXT_EXTRACTED` warning is emitted.

---

## 9. Parsing Pipeline

Every `route()` call follows the same six-step pipeline. Format-specific logic is encapsulated within the parser functions; the pipeline itself is format-agnostic.

```
┌───────────────────────────────────────────────────────────────────────┐
│                        route(input, options)                          │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │  Step 1    │  │  Step 2    │  │  Step 3    │  │  Step 4        │  │
│  │  Read      │─▶│  Detect    │─▶│  Select    │─▶│  Parse         │  │
│  │  Input     │  │  Format    │  │  Parser    │  │                │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────┘  │
│                                                         │             │
│                                          ┌──────────────▼──────────┐  │
│                                          │  Step 5                 │  │
│                                          │  Post-Process           │  │
│                                          │  (cleanup, normalize)   │  │
│                                          └──────────────┬──────────┘  │
│                                                         │             │
│                                          ┌──────────────▼──────────┐  │
│                                          │  Step 6                 │  │
│                                          │  Build RouteResult      │  │
│                                          └─────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### Step 1: Read Input

The input is normalized to a `Buffer` and metadata:

- **File path** (`string` starting with `/`, `./`, or `C:\`): Read the file with `fs.promises.readFile`. Extract the file name and extension from the path.
- **URL** (`string` starting with `http://` or `https://`, or `URL` object): Fetch the content with `fetch()`. Extract the file name from the URL path. Record the `Content-Type` header as a MIME type hint.
- **Buffer**: Use directly. No file name or extension is available unless provided in `options.fileName`.
- **ReadableStream**: Collect all chunks into a Buffer. No file name or extension is available unless provided in `options.fileName`.

If the input cannot be read (file not found, URL unreachable, stream error), the pipeline throws an `InputError` with a descriptive message.

### Step 2: Detect Format

The format detection engine runs the detection algorithms described in Section 5. It produces a `FormatInfo` object:

```typescript
interface FormatInfo {
  /** The detected format identifier. */
  format: string;

  /** Confidence score (0.0 to 1.0). */
  confidence: number;

  /** The detection method that produced this result. */
  method: 'explicit' | 'magic-bytes' | 'zip-content-type' | 'mime-type' | 'extension' | 'content-heuristic';

  /** For code formats: the detected programming language. */
  language?: string;

  /** For image formats: the image subtype. */
  subtype?: string;
}
```

If detection fails (unrecognizable format, no extension, no magic bytes), the pipeline throws a `FormatDetectionError`.

### Step 3: Select Parser

The parser registry is queried for the detected format. The highest-priority parser is selected (custom > docling > builtin). If no parser is registered for the format, the pipeline throws an `UnsupportedFormatError`.

### Step 4: Parse

The selected parser is invoked with the `ParserInput` (Buffer, file path, file name, MIME type) and `ParserOptions` (format-specific options from the caller). The parser returns a `ParserOutput` with the content string, output format, optional metadata, and optional warnings.

Parser invocation is wrapped in a try/catch. If the parser throws, the error is wrapped in a `ParseError` with the format identifier and the original error message.

### Step 5: Post-Process

The parser's output content is cleaned up:

1. **Encoding normalization**: Ensure UTF-8. If the content contains non-UTF-8 sequences, attempt conversion and emit an `ENCODING_ISSUE` warning.
2. **Whitespace normalization**: Collapse more than two consecutive blank lines to exactly two. Remove trailing whitespace from every line. Ensure the content ends with exactly one newline.
3. **Null byte and control character removal**: Strip null bytes (`\0`) and control characters (ASCII 0-31 except `\n` and `\t`).
4. **BOM removal**: Remove UTF-8 byte-order marks from the beginning of the content.

### Step 6: Build RouteResult

The `RouteResult` is assembled from the parser output, detection result, metadata, warnings, and timing information. Word count and character count are computed from the final content string. The duration is measured from the start of Step 1 to the end of Step 5 using `performance.now()`.

---

## 10. Code File Handling

Source code files receive special treatment because they are a common file type in knowledge bases and RAG pipelines (repository indexing, documentation systems, code Q&A).

### 10.1 Language Detection

The programming language is determined from the file extension using the mapping in Section 5.4. The detected language is used for the code fence's language tag and stored in `metadata.language`.

When no extension is available (Buffer input without `options.fileName`), the content is inspected for language indicators:

1. **Shebang line**: `#!/usr/bin/env python3` indicates Python. `#!/bin/bash` indicates Bash.
2. **Syntax patterns**: `import React` suggests TypeScript/JavaScript. `def ` and `class ` with indentation suggest Python. `fn main()` suggests Rust. `package main` suggests Go. `public class` suggests Java.
3. **Fallback**: If no language can be determined, the code is wrapped in an untagged code fence.

Language detection from content is heuristic with low confidence (`0.4`). It is a best-effort feature, not a guarantee.

### 10.2 Code Fence Wrapping

The entire file content is wrapped in a markdown fenced code block with the detected language tag:

````markdown
```python
#!/usr/bin/env python3

def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

if __name__ == "__main__":
    for i in range(10):
        print(fibonacci(i))
```
````

The code fence uses triple backticks. If the source code itself contains triple backticks, the fence uses quadruple backticks to avoid ambiguity.

### 10.3 Optional Comment Extraction

When `codeOptions.extractComments` is enabled, block comments and docstrings are extracted from the source code and emitted as a separate text section before the code fence. This enables RAG pipelines to index documentation and code separately.

```markdown
## Documentation Comments

Module for computing Fibonacci numbers.

Provides both recursive and iterative implementations
for performance comparison.

## Source Code

```python
"""Module for computing Fibonacci numbers.

Provides both recursive and iterative implementations
for performance comparison.
"""

def fibonacci(n: int) -> int:
    ...
```
```

Comment extraction is language-aware: `/* ... */` and `// ...` for C-family languages, `""" ... """` and `# ...` for Python, `-- ...` for SQL and Haskell.

### 10.4 File Metadata Header

When `codeOptions.includeHeader` is enabled, the output includes a metadata header:

```markdown
## File: src/utils/fibonacci.py (Python)

```python
def fibonacci(n: int) -> int:
    ...
```
```

---

## 11. Image Handling

Images are the most variable format in terms of extractable text content. A photograph of a whiteboard contains text that OCR can extract. A logo contains no meaningful text. A screenshot of a terminal contains code. A chart contains data that would be better described than transcribed. The image handler provides two modes to accommodate these differences.

### 11.1 OCR Mode

When OCR is enabled (`imageOptions.ocr: true`), the image is passed to `tesseract.js` for optical character recognition. `tesseract.js` is a peer dependency that must be installed separately.

**Processing**:

1. Read the image into a Buffer.
2. Pass the Buffer to `tesseract.js` with the configured language (default: `'eng'`).
3. Receive the recognized text.
4. Clean up the text: normalize whitespace, remove stray characters and noise artifacts, trim leading and trailing whitespace.
5. If the recognized text is empty or below a minimum length threshold (default: 10 characters), emit a `NO_TEXT_EXTRACTED` warning and return the placeholder instead.
6. Return the recognized text as the content with `outputFormat: 'text'`.

**Configuration**:

```typescript
interface ImageOptions {
  /** Enable OCR for image files. Requires tesseract.js. Default: false. */
  ocr?: boolean;

  /** OCR language(s). Default: 'eng'. */
  ocrLanguage?: string;

  /** Minimum OCR text length to accept (below this, use placeholder). Default: 10. */
  ocrMinLength?: number;
}
```

**Performance**: OCR adds 2-10 seconds per image depending on image size, complexity, and system resources. For batch processing, images with OCR are the primary performance bottleneck.

### 11.2 Placeholder Mode

When OCR is disabled (default), images produce a placeholder string that provides context about the image without extracting text:

```
[Image: quarterly-chart.png (1200x800, 156KB, PNG)]
```

The placeholder includes:
- File name (if available).
- Dimensions in pixels (extracted from the image header without full decoding -- PNG and JPEG headers contain dimensions in the first few hundred bytes).
- File size in human-readable format.
- Image format.

Dimensions are extracted by reading the image header:
- **PNG**: Width and height are at bytes 16-23 of the IHDR chunk.
- **JPEG**: Width and height are in the SOF0/SOF2 marker segment.
- **GIF**: Width and height are at bytes 6-9 of the header.
- **WEBP**: Width and height are in the VP8/VP8L chunk header.
- **BMP**: Width and height are at bytes 18-25 of the DIB header.
- **TIFF**: Width and height are in the IFD entries.

If dimensions cannot be extracted, they are omitted from the placeholder.

---

## 12. Batch Processing

### 12.1 routeBatch

`routeBatch` processes multiple files in parallel with configurable concurrency and per-file error handling.

```typescript
async function routeBatch(
  inputs: Array<string | Buffer | { input: string | Buffer; options?: RouteOptions }>,
  options?: BatchOptions,
): Promise<BatchResult>;

interface BatchOptions extends RouteOptions {
  /** Maximum number of files to process concurrently. Default: 5. */
  concurrency?: number;

  /** Whether to stop processing on the first error. Default: false. */
  failFast?: boolean;

  /** Callback invoked after each file is processed. */
  onProgress?: (progress: BatchProgress) => void;
}

interface BatchResult {
  /** Results for each input, in the same order as the inputs array. */
  results: Array<RouteResult | RouteError>;

  /** Total number of files processed. */
  totalFiles: number;

  /** Number of files successfully processed. */
  succeeded: number;

  /** Number of files that failed. */
  failed: number;

  /** Total processing time in milliseconds. */
  durationMs: number;
}

interface BatchProgress {
  /** Index of the completed file in the inputs array. */
  index: number;

  /** Total number of files. */
  total: number;

  /** Whether this file succeeded or failed. */
  status: 'success' | 'error';

  /** The file path or identifier, if available. */
  file?: string;
}

interface RouteError {
  /** Error indicator. */
  success: false;

  /** The error that occurred. */
  error: Error;

  /** The file path or identifier, if available. */
  file?: string;
}
```

**Behavior**:

- Files are processed in parallel up to the `concurrency` limit. Default concurrency is 5, suitable for I/O-bound parsing. For CPU-bound parsing (OCR), lower concurrency (1-2) is recommended.
- When a file fails, its slot in the `results` array contains a `RouteError` instead of a `RouteResult`. Other files continue processing unless `failFast` is `true`.
- The `onProgress` callback is invoked after each file completes, enabling progress tracking in UIs or CLIs.
- Results are returned in the same order as the inputs, regardless of processing order.

### 12.2 routeDirectory

`routeDirectory` recursively scans a directory and processes all files.

```typescript
async function routeDirectory(
  dirPath: string,
  options?: DirectoryOptions,
): Promise<BatchResult>;

interface DirectoryOptions extends BatchOptions {
  /** Whether to scan subdirectories recursively. Default: true. */
  recursive?: boolean;

  /** Glob patterns for files to include. Default: all files. */
  include?: string[];

  /** Glob patterns for files to exclude. Default: node_modules, .git, dist, etc. */
  exclude?: string[];

  /** Maximum file size in bytes to process. Files larger are skipped with a warning. Default: 50MB. */
  maxFileSize?: number;

  /** Maximum total number of files to process. Default: 10000. */
  maxFiles?: number;
}
```

**Default exclusions**: `node_modules`, `.git`, `.svn`, `.hg`, `dist`, `build`, `__pycache__`, `.DS_Store`, `Thumbs.db`, `*.lock`, `package-lock.json`, `yarn.lock`.

**Behavior**:

- The directory is scanned using `fs.promises.readdir` with `recursive: true` (Node.js 18.17+) or a recursive walk for older versions.
- Files matching exclude patterns are skipped.
- Files exceeding `maxFileSize` are skipped with a `LARGE_FILE` warning.
- Files whose format cannot be detected are skipped with a warning.
- The total number of files is capped at `maxFiles` to prevent accidental processing of enormous directory trees.
- Processing uses `routeBatch` internally with the configured concurrency.

---

## 13. API Surface

### Installation

```bash
npm install ai-file-router
```

### Main Export: `route`

The primary API. Auto-detects format and returns a route result.

```typescript
import { route } from 'ai-file-router';

// From file path
const result = await route('./quarterly-report.pdf');
console.log(result.content);        // Markdown string
console.log(result.sourceFormat);    // 'pdf'
console.log(result.parserUsed);     // 'docling-node-ts' or 'pdf-parse'

// From Buffer with MIME type hint
const buffer = await fs.promises.readFile('./data.csv');
const result = await route(buffer, { mimeType: 'text/csv', fileName: 'data.csv' });

// From URL
const result = await route('https://example.com/report.pdf');

// With format override
const result = await route('./mystery-file', { format: 'json' });
```

### Batch Export: `routeBatch`

Process multiple files in parallel.

```typescript
import { routeBatch } from 'ai-file-router';

const results = await routeBatch(
  ['./report.pdf', './data.csv', './readme.md', './image.png'],
  { concurrency: 3, onProgress: (p) => console.log(`${p.index + 1}/${p.total}`) },
);

console.log(`Processed ${results.succeeded} of ${results.totalFiles} files`);
```

### Directory Export: `routeDirectory`

Recursively process a directory.

```typescript
import { routeDirectory } from 'ai-file-router';

const results = await routeDirectory('./knowledge-base/', {
  recursive: true,
  include: ['*.pdf', '*.docx', '*.md', '*.csv'],
  exclude: ['**/drafts/**'],
  concurrency: 5,
});

for (const result of results.results) {
  if ('content' in result) {
    console.log(`${result.metadata.fileName}: ${result.metadata.wordCount} words`);
  }
}
```

### Detection Export: `detectFormat`

Detect a file's format without parsing it.

```typescript
import { detectFormat } from 'ai-file-router';

const info = await detectFormat('./mystery-file');
console.log(info);
// { format: 'pdf', confidence: 1.0, method: 'magic-bytes' }

const info2 = await detectFormat(buffer, { fileName: 'data.csv' });
console.log(info2);
// { format: 'csv', confidence: 0.6, method: 'extension' }
```

### Factory Export: `createRouter`

Creates a configured router instance with preset options and custom parsers.

```typescript
import { createRouter } from 'ai-file-router';

const router = createRouter({
  preferDocling: true,
  defaultOutputFormat: 'markdown',
  imageOptions: { ocr: true, ocrLanguage: 'eng' },
  codeOptions: { extractComments: true, includeHeader: true },
  concurrency: 3,
});

// Register a custom parser
router.register('dwg', async (input) => ({
  content: await parseDwg(input.buffer),
  format: 'text',
}));

// Use the configured router
const result = await router.route('./file.pdf');
const batch = await router.routeBatch(['./a.pdf', './b.docx']);
const dir = await router.routeDirectory('./docs/');
const format = await router.detectFormat('./mystery');
```

### Type Definitions

```typescript
// ── Input Types ─────────────────────────────────────────────────────

/** Accepted input types for routing. */
type FileInput = string | Buffer | URL | ReadableStream<Uint8Array>;

/** Supported source format identifiers. */
type SourceFormat =
  | 'pdf' | 'docx' | 'pptx' | 'odt' | 'rtf'
  | 'xlsx' | 'csv' | 'tsv'
  | 'html' | 'xml'
  | 'markdown' | 'rst'
  | 'json' | 'yaml' | 'toml'
  | 'code' | 'image' | 'text'
  | string;  // extensible for custom formats

// ── Route Options ───────────────────────────────────────────────────

/** Options for the route function. */
interface RouteOptions {
  /**
   * Explicitly specify the input format.
   * If provided, format detection is skipped.
   */
  format?: string;

  /**
   * MIME type hint for format detection.
   * Used when the input is a Buffer or stream without a file extension.
   */
  mimeType?: string;

  /**
   * File name hint for format detection.
   * Provides the extension when the input is a Buffer or stream.
   */
  fileName?: string;

  /**
   * Preferred output format.
   * 'markdown': prefer markdown output when the parser supports it.
   * 'text': prefer plain text output.
   * Default: 'markdown'.
   */
  outputFormat?: 'markdown' | 'text';

  /** Image-specific options. */
  imageOptions?: ImageOptions;

  /** Code file-specific options. */
  codeOptions?: CodeOptions;

  /** CSV/TSV-specific options. */
  csvOptions?: CsvOptions;

  /** Options passed through to docling-node-ts when it is the selected parser. */
  doclingOptions?: Record<string, unknown>;

  /** AbortSignal for external cancellation. */
  signal?: AbortSignal;
}

/** Image handling options. */
interface ImageOptions {
  /** Enable OCR for image files. Default: false. */
  ocr?: boolean;
  /** OCR language(s). Default: 'eng'. */
  ocrLanguage?: string;
  /** Minimum OCR text length to accept. Default: 10. */
  ocrMinLength?: number;
}

/** Code file handling options. */
interface CodeOptions {
  /** Extract block comments as a separate documentation section. Default: false. */
  extractComments?: boolean;
  /** Include a file metadata header above the code fence. Default: false. */
  includeHeader?: boolean;
}

/** CSV/TSV parsing options. */
interface CsvOptions {
  /** Whether the first row is a header row. Default: true. */
  hasHeader?: boolean;
  /** Field delimiter character. Default: auto-detect (',' for .csv, '\t' for .tsv). */
  delimiter?: string;
  /** Maximum number of rows to include in the output. Default: 1000. */
  maxRows?: number;
}

// ── Router Configuration ────────────────────────────────────────────

/** Configuration for createRouter(). */
interface RouterConfig {
  /** Whether to prefer docling-node-ts when available. Default: true. */
  preferDocling?: boolean;

  /** Default output format preference. Default: 'markdown'. */
  defaultOutputFormat?: 'markdown' | 'text';

  /** Default image options. */
  imageOptions?: ImageOptions;

  /** Default code file options. */
  codeOptions?: CodeOptions;

  /** Default CSV/TSV options. */
  csvOptions?: CsvOptions;

  /** Default batch concurrency. Default: 5. */
  concurrency?: number;

  /** Default options passed through to docling-node-ts. */
  doclingOptions?: Record<string, unknown>;
}

// ── Router Instance ─────────────────────────────────────────────────

/** A configured router instance created by createRouter(). */
interface FileRouter {
  /** Route a single file. */
  route(input: FileInput, options?: RouteOptions): Promise<RouteResult>;

  /** Route multiple files in parallel. */
  routeBatch(
    inputs: Array<string | Buffer | { input: string | Buffer; options?: RouteOptions }>,
    options?: BatchOptions,
  ): Promise<BatchResult>;

  /** Recursively route all files in a directory. */
  routeDirectory(dirPath: string, options?: DirectoryOptions): Promise<BatchResult>;

  /** Detect a file's format without parsing. */
  detectFormat(input: FileInput, options?: Pick<RouteOptions, 'mimeType' | 'fileName'>): Promise<FormatInfo>;

  /** Register a custom parser for a format. */
  register(format: string, parser: ParserFn): void;

  /** List all registered formats and their parser tiers. */
  listFormats(): FormatRegistration[];
}

interface FormatRegistration {
  format: string;
  parsers: Array<{ priority: 'custom' | 'docling' | 'builtin'; label: string }>;
}

// ── Errors ──────────────────────────────────────────────────────────

/** Thrown when the input cannot be read. */
class InputError extends Error {
  code: 'INPUT_ERROR';
}

/** Thrown when format detection fails. */
class FormatDetectionError extends Error {
  code: 'FORMAT_DETECTION_FAILED';
}

/** Thrown when no parser is registered for the detected format. */
class UnsupportedFormatError extends Error {
  code: 'UNSUPPORTED_FORMAT';
  format: string;
}

/** Thrown when the parser fails to process the file. */
class ParseError extends Error {
  code: 'PARSE_FAILED';
  format: string;
  cause: Error;
}
```

### Example: Full RAG Pipeline

```typescript
import { route } from 'ai-file-router';
import { chunk } from 'chunk-smart';
import { createEmbedCache } from 'embed-cache';

// Route any file to text/markdown
const { content, metadata, sourceFormat } = await route('./quarterly-report.pdf');

console.log(`Routed ${sourceFormat} file: ${metadata.title} (${metadata.wordCount} words)`);

// Chunk the content for embedding
const chunks = chunk(content, {
  maxChunkSize: 512,
  overlap: 50,
  customMetadata: {
    source: metadata.fileName,
    title: metadata.title,
    format: sourceFormat,
  },
});

// Embed the chunks
const cache = createEmbedCache({ provider: 'openai', model: 'text-embedding-3-small' });
const embeddings = await Promise.all(chunks.map(c => cache.embed(c.content)));

console.log(`Produced ${chunks.length} chunks with ${embeddings.length} embeddings`);
```

---

## 14. Configuration

### Default Values

| Option | Default | Description |
|--------|---------|-------------|
| `format` | `undefined` (auto-detect) | Explicit format override. |
| `mimeType` | `undefined` | MIME type hint for detection. |
| `fileName` | `undefined` | File name hint for detection. |
| `outputFormat` | `'markdown'` | Preferred output format. |
| `imageOptions.ocr` | `false` | Enable OCR for images. |
| `imageOptions.ocrLanguage` | `'eng'` | OCR language. |
| `imageOptions.ocrMinLength` | `10` | Minimum OCR text length. |
| `codeOptions.extractComments` | `false` | Extract comments separately. |
| `codeOptions.includeHeader` | `false` | Include file metadata header. |
| `csvOptions.hasHeader` | `true` | First row is header. |
| `csvOptions.delimiter` | Auto-detect | Field delimiter. |
| `csvOptions.maxRows` | `1000` | Maximum rows to include. |
| `preferDocling` | `true` | Use docling-node-ts when available. |
| `concurrency` | `5` | Default batch concurrency. |

### Configuration Precedence

When using `createRouter`, options are merged with the following precedence (highest first):

1. Per-call options passed to `router.route(input, options)`.
2. Factory-level options passed to `createRouter(config)`.
3. Built-in defaults.

---

## 15. CLI Design

### Installation and Invocation

```bash
# Global install
npm install -g ai-file-router
ai-file-router report.pdf

# npx (no install)
npx ai-file-router document.docx

# Package script
# package.json: { "scripts": { "convert": "ai-file-router" } }
```

### CLI Binary Name

`ai-file-router`

### Commands and Flags

```
ai-file-router <input...> [options]

Input:
  <input...>                 One or more file paths, URLs, or a directory path.

Output:
  -o, --output <path>        Write output to a file instead of stdout.
                              For batch: output directory (one file per input).
  --stdout                   Force output to stdout (default for single file).
  --ext <extension>          Output file extension for batch mode. Default: .md.

Format:
  -f, --format <format>      Input format override. Default: auto-detect.
  --output-format <format>   Output format: markdown, text. Default: markdown.

Batch and directory:
  -r, --recursive            Recursively process directories.
  --include <glob>           Glob pattern for files to include (repeatable).
  --exclude <glob>           Glob pattern for files to exclude (repeatable).
  --concurrency <n>          Number of files to process in parallel. Default: 5.
  --max-files <n>            Maximum number of files to process. Default: 10000.
  --max-file-size <bytes>    Maximum file size to process. Default: 50MB.

Image options:
  --ocr                      Enable OCR for image files.
  --ocr-lang <lang>          OCR language. Default: eng.

Code options:
  --extract-comments         Extract code comments as separate text.
  --include-header           Include file metadata header for code files.

CSV options:
  --no-header                CSV has no header row.
  --delimiter <char>         CSV field delimiter.
  --max-rows <n>             Maximum CSV rows to output. Default: 1000.

General:
  --detect                   Detect format only, do not parse. Print format info.
  --json                     Output RouteResult as JSON instead of content only.
  --quiet                    Suppress warnings and status messages.
  --verbose                  Show detailed processing progress.
  --version                  Print version and exit.
  --help                     Print help and exit.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success. All files processed successfully. |
| `1` | Processing error. One or more files failed to process. |
| `2` | Configuration error. Invalid flags, missing input, bad options. |
| `3` | Input error. File not found, directory not accessible, URL unreachable. |

### Usage Examples

```bash
# Convert a single PDF to markdown (stdout)
ai-file-router report.pdf

# Convert and save to file
ai-file-router report.pdf -o report.md

# Convert multiple files
ai-file-router report.pdf data.csv readme.md -o ./output/

# Process a directory recursively
ai-file-router ./docs/ -r -o ./text/ --include '*.pdf' --include '*.docx'

# Detect format without parsing
ai-file-router mystery-file --detect

# Convert image with OCR
ai-file-router whiteboard.png --ocr --ocr-lang eng

# Convert CSV with custom delimiter
ai-file-router data.tsv --delimiter '\t' --max-rows 500

# Convert code file with comment extraction
ai-file-router src/index.ts --extract-comments --include-header

# Output full RouteResult as JSON
ai-file-router report.pdf --json | jq '.metadata'

# Batch convert with progress
ai-file-router ./knowledge-base/ -r --verbose --concurrency 10 -o ./processed/
```

### Environment Variables

| Environment Variable | Equivalent Flag |
|---------------------|-----------------|
| `AI_FILE_ROUTER_CONCURRENCY` | `--concurrency` |
| `AI_FILE_ROUTER_OCR` | `--ocr` (set to `1` or `true`) |
| `AI_FILE_ROUTER_OCR_LANG` | `--ocr-lang` |
| `AI_FILE_ROUTER_OUTPUT_FORMAT` | `--output-format` |
| `AI_FILE_ROUTER_MAX_FILES` | `--max-files` |
| `AI_FILE_ROUTER_MAX_FILE_SIZE` | `--max-file-size` |

---

## 16. Integration

### With `docling-node-ts`

`docling-node-ts` provides high-quality document-to-markdown conversion for PDF, DOCX, PPTX, and HTML. When installed, `ai-file-router` automatically uses it as the primary parser for these formats, producing significantly better output than the built-in fallback parsers.

```typescript
// Install both packages
// npm install ai-file-router docling-node-ts

import { route } from 'ai-file-router';

// docling-node-ts is automatically used when available
const result = await route('./report.pdf');
console.log(result.parserUsed); // 'docling-node-ts'

// Pass docling-specific options through
const result = await route('./report.pdf', {
  doclingOptions: {
    pdf: { columns: 'auto', removeHeaders: true },
    images: { mode: 'skip' },
  },
});
```

### With `chunk-smart`

`chunk-smart` provides structure-aware text chunking for RAG pipelines. `ai-file-router` produces the text/markdown; `chunk-smart` chunks it for embedding.

```typescript
import { route } from 'ai-file-router';
import { chunk } from 'chunk-smart';

const { content, metadata } = await route('./report.pdf');

const chunks = chunk(content, {
  maxChunkSize: 512,
  overlap: 50,
  customMetadata: {
    source: metadata.fileName,
    title: metadata.title,
  },
});
```

### With `embed-cache`

`embed-cache` provides content-addressable embedding caching. Route files, chunk them, then embed with deduplication and caching.

```typescript
import { routeDirectory } from 'ai-file-router';
import { chunk } from 'chunk-smart';
import { createEmbedCache } from 'embed-cache';

const cache = createEmbedCache({ provider: 'openai', model: 'text-embedding-3-small' });

const dirResult = await routeDirectory('./knowledge-base/', { recursive: true });

for (const result of dirResult.results) {
  if ('content' in result) {
    const chunks = chunk(result.content, { maxChunkSize: 512 });
    await Promise.all(chunks.map(c => cache.embed(c.content)));
  }
}
```

### With `rag-prompt-builder`

`rag-prompt-builder` composes RAG prompts from retrieved chunks. Files routed by `ai-file-router`, chunked by `chunk-smart`, and embedded by `embed-cache` flow into `rag-prompt-builder` for final prompt composition.

```typescript
import { route } from 'ai-file-router';
import { chunk } from 'chunk-smart';
import { buildPrompt } from 'rag-prompt-builder';

const { content, metadata } = await route('./manual.pdf');
const chunks = chunk(content, { maxChunkSize: 512 });

// After embedding and retrieval...
const retrieved = await searchChunks(query, chunks);

const prompt = buildPrompt({
  query,
  chunks: retrieved,
  systemContext: `Source: ${metadata.title} by ${metadata.author}`,
});
```

### Full Ingestion Pipeline

```typescript
import { routeDirectory } from 'ai-file-router';
import { chunk } from 'chunk-smart';
import { createEmbedCache } from 'embed-cache';
import { buildPrompt } from 'rag-prompt-builder';

// 1. Route all files in a directory to text/markdown
const results = await routeDirectory('./company-docs/', {
  recursive: true,
  include: ['*.pdf', '*.docx', '*.md', '*.csv', '*.html'],
  concurrency: 5,
});

// 2. Chunk every result
const allChunks = results.results.flatMap(result => {
  if (!('content' in result)) return [];
  return chunk(result.content, {
    maxChunkSize: 512,
    overlap: 50,
    customMetadata: { source: result.metadata.fileName },
  });
});

// 3. Embed and store
const cache = createEmbedCache({ provider: 'openai', model: 'text-embedding-3-small' });
for (const c of allChunks) {
  await cache.embed(c.content);
}

// 4. At query time: retrieve and build prompt
const retrieved = await searchChunks(userQuery, allChunks);
const prompt = buildPrompt({ query: userQuery, chunks: retrieved });
```

---

## 17. Testing Strategy

### Unit Tests

Unit tests verify individual components in isolation.

- **Format detection tests**: Verify correct detection for every supported format. Test magic byte detection (feed first N bytes of each format), extension mapping (every extension in the mapping table), MIME type mapping, ZIP disambiguation (DOCX vs PPTX vs XLSX via `[Content_Types].xml`), detection priority (magic bytes override extension when they disagree), and explicit format override.
- **Parser registry tests**: Verify parser registration, priority ordering (custom > docling > builtin), parser replacement, `listFormats()`, and `UnsupportedFormatError` for unknown formats.
- **Built-in parser tests**: For each built-in parser, verify correct output for simple inputs. CSV parser: verify RFC 4180 compliance (quoted fields, escaped quotes, multiline fields). Code parser: verify correct language tag, code fence wrapping, comment extraction. JSON parser: verify pretty-printing and code fence wrapping. Image parser: verify placeholder format with and without dimensions. Text parser: verify line ending normalization and whitespace cleanup.
- **Post-processing tests**: Verify whitespace normalization (collapse blank lines, remove trailing whitespace), null byte removal, BOM removal, and encoding normalization.
- **Batch processing tests**: Verify concurrency limiting, per-file error isolation, progress callback invocation, result ordering, and `failFast` behavior.
- **Directory scanning tests**: Verify recursive scanning, include/exclude glob patterns, `maxFileSize` and `maxFiles` limits, and default exclusion of `node_modules`, `.git`, etc.
- **CLI parsing tests**: Verify argument parsing, environment variable fallback, flag precedence, and error messages for invalid input.
- **Output formatting tests**: Verify `RouteResult` structure, metadata population (word count, char count), and `DocumentMetadata` fields.

### Integration Tests

End-to-end tests that route real files and verify output quality.

- **PDF routing test**: Route a PDF file. Verify `sourceFormat === 'pdf'`, `outputFormat === 'markdown'`, content contains headings and text, metadata includes page count and word count.
- **DOCX routing test**: Route a DOCX file. Verify structural elements in the markdown output.
- **CSV routing test**: Route a CSV file. Verify output contains a markdown table with correct headers and row count.
- **XLSX routing test**: Route an XLSX file. Verify output contains per-sheet sections with markdown tables.
- **Code file routing test**: Route a `.ts` file. Verify output is a markdown code fence with `typescript` language tag.
- **Image routing test (placeholder)**: Route a PNG without OCR. Verify output is the placeholder format with dimensions.
- **Image routing test (OCR)**: Route a PNG with OCR enabled. Verify OCR-extracted text is returned (requires `tesseract.js`).
- **JSON routing test**: Route a JSON file. Verify output is pretty-printed JSON in a code fence.
- **Markdown routing test**: Route a `.md` file. Verify content is passed through with cleanup.
- **Batch routing test**: Route 10 mixed-format files. Verify all results are returned in order, failed files have `RouteError`, and succeeded count is correct.
- **Directory routing test**: Create a temp directory with mixed files. Run `routeDirectory`. Verify all files are processed, excluded files are skipped, and results match expectations.
- **docling-node-ts integration test**: When `docling-node-ts` is installed, route a PDF and verify `parserUsed === 'docling-node-ts'`. When it is not installed, verify fallback parser is used and a `FALLBACK_PARSER` warning is emitted.
- **Custom parser test**: Register a custom parser, route a file of that format, and verify the custom parser's output is returned.
- **Format detection test**: Feed files with mismatched extension and content (e.g., a PDF file with a `.txt` extension). Verify magic bytes win over extension.
- **Determinism test**: Route the same file twice with the same options. Verify identical `RouteResult.content`.

### Edge Cases to Test

- Empty file (zero bytes).
- File with no extension and no recognizable magic bytes.
- Binary file that is not a recognized format (e.g., a compiled executable).
- File with incorrect extension (a JSON file named `data.pdf`).
- Very large file (100MB+) -- verify `LARGE_FILE` warning and reasonable processing time.
- File with non-UTF-8 encoding (ISO-8859-1, Shift-JIS) -- verify `ENCODING_ISSUE` warning and best-effort conversion.
- CSV with malformed rows (inconsistent column counts).
- XLSX with multiple sheets, some empty.
- Code file with no extension but a shebang line.
- Image file with corrupted header (dimensions unreadable).
- Buffer input with no `fileName` or `mimeType`.
- URL that returns a 404.
- AbortSignal triggered mid-processing.
- Concurrent `route()` calls on the same router instance.
- `routeDirectory` on an empty directory.
- `routeDirectory` on a directory with only excluded files.

### Test Framework

Tests use Vitest, matching the project's existing configuration in `package.json`.

---

## 18. Performance

### Design Constraints

File routing is I/O-bound for most formats: reading the file from disk is the slowest step, and parsing text-based formats (CSV, JSON, YAML, code, markdown, HTML) is fast. The performance-critical formats are PDF (binary format requiring layout analysis), XLSX (ZIP decompression + XML parsing), and images with OCR (2-10 seconds per image). The performance goal is to add negligible overhead from routing itself -- the detection and dispatch should take less than 1ms, and the total processing time should be dominated by the parser, not the router.

### Performance Targets

| Operation | Expected Time |
|-----------|---------------|
| Format detection (magic bytes) | < 1ms |
| Format detection (ZIP disambiguation) | < 10ms (requires ZIP header read) |
| Routing overhead (detection + dispatch + post-processing) | < 5ms |
| CSV parsing (1000 rows) | < 50ms |
| JSON parsing (1MB) | < 20ms |
| Code file wrapping | < 1ms |
| Markdown passthrough | < 1ms |
| HTML parsing (cheerio fallback, 100KB) | < 200ms |
| PDF parsing (docling-node-ts, 10 pages) | < 1s |
| PDF parsing (pdf-parse fallback, 10 pages) | < 500ms |
| XLSX parsing (5 sheets, 1000 rows each) | < 1s |
| Image OCR (tesseract.js) | 2-10s per image |
| `routeBatch` (100 text files, concurrency 5) | < 2s |
| `routeDirectory` (1000 files, mixed formats) | < 60s |

### Memory Usage

Memory usage is proportional to the file size being processed. Each file is read entirely into a Buffer. For most formats (text-based), the Buffer and the output string are the primary memory consumers, totaling approximately 2-3x the file size. For PDF and XLSX (binary formats with internal compression), peak memory can reach 5-10x the file size during decompression and parsing.

Batch processing with `concurrency: N` holds up to N files in memory simultaneously. For directories with large files, reduce concurrency to limit memory usage.

### Routing Overhead

The router itself adds minimal overhead:

1. **Magic byte check**: Reading the first 12 bytes of the Buffer and comparing against known signatures. This is a constant-time operation.
2. **Extension extraction**: Extracting the file extension from a path string. This is a constant-time string operation.
3. **Registry lookup**: A `Map.get()` call. O(1).
4. **Post-processing**: A single pass through the output string for whitespace normalization. O(n) where n is the output length, but with very low constant factor (simple character scanning).

Total routing overhead is under 5ms for any file, regardless of size. The overhead is negligible compared to parser execution time.

---

## 19. Dependencies

### Runtime Dependencies

| Dependency | Purpose | Why Not Avoid It |
|-----------|---------|-----------------|
| `file-type` | Magic byte detection for binary file formats (PDF, images, ZIP-based documents). | Implements detection for 300+ file types with maintained signature databases. Reimplementing magic byte detection for all supported formats is error-prone and requires ongoing maintenance as formats evolve. The package is small (few KB) and has no transitive dependencies. |
| `cheerio` | HTML parsing and DOM traversal for the built-in HTML parser fallback. | Required for the HTML-to-markdown conversion when `docling-node-ts` is not installed. `cheerio` provides a jQuery-like API with fast HTML parsing via `htmlparser2`. Lighter than `jsdom`. |
| `xlsx` | Excel file parsing for the XLSX parser. | SheetJS is the de facto JavaScript library for reading Excel files. No viable alternative exists that handles the full XLSX format (shared strings, formulas, merged cells, multiple sheets). |
| `jszip` | ZIP archive reading for DOCX, PPTX, and ODT fallback parsers, and for ZIP-based format disambiguation. | DOCX, PPTX, XLSX, and ODT are all ZIP archives. `jszip` is required to read `[Content_Types].xml` for format disambiguation and to extract XML content from Office documents when using fallback parsers. |

### Optional Peer Dependencies

| Dependency | Purpose | Required When |
|-----------|---------|---------------|
| `docling-node-ts` | High-quality document conversion for PDF, DOCX, PPTX, and HTML. | When higher quality output is desired for document formats. The router works without it using built-in fallback parsers. |
| `tesseract.js` | OCR for image files. | Only when `imageOptions.ocr: true`. Not installed by default. |
| `mammoth` | DOCX-to-HTML conversion for the DOCX fallback parser. | Only when `docling-node-ts` is not installed and DOCX files are routed. |
| `pdf-parse` | Basic PDF text extraction for the PDF fallback parser. | Only when `docling-node-ts` is not installed and PDF files are routed. |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | TypeScript compiler. |
| `vitest` | Test runner. |
| `eslint` | Linter. |
| `@types/node` | Node.js type definitions. |

### Why These Dependencies

The dependency set follows a principle: include libraries only for problems that are fundamentally hard to solve correctly (binary format parsing, ZIP archive reading, HTML DOM traversal, spreadsheet format handling) and implement everything else with hand-written code using Node.js built-in modules. CSV parsing follows RFC 4180 and is implemented without a library. Code fence wrapping is string concatenation. JSON pretty-printing uses `JSON.stringify`. YAML and TOML passthrough is trivial. Format detection logic is hand-written with `file-type` providing the magic byte database. CLI argument parsing uses `util.parseArgs` from Node.js 18+.

---

## 20. Error Handling

### Error Classification

Errors are classified into typed error classes with error codes:

| Error Class | Code | Cause |
|------------|------|-------|
| `InputError` | `INPUT_ERROR` | File not found, URL unreachable, permission denied, stream read failure. |
| `FormatDetectionError` | `FORMAT_DETECTION_FAILED` | File format could not be determined from magic bytes, MIME type, or extension. |
| `UnsupportedFormatError` | `UNSUPPORTED_FORMAT` | Format was detected but no parser is registered for it (e.g., legacy `.doc` without a custom parser). |
| `ParseError` | `PARSE_FAILED` | The selected parser threw an error during processing. Wraps the original parser error. |

### Error Propagation

- `route()` throws on failure. The thrown error is always one of the four typed error classes.
- `routeBatch()` does not throw on individual file failures. Failed files produce `RouteError` objects in the results array. `routeBatch()` only throws if there is a configuration error (invalid options) or if `failFast` is `true` and a file fails.
- `routeDirectory()` follows the same error model as `routeBatch()`.
- The CLI catches all errors, prints a human-readable message to stderr, and exits with the appropriate exit code.

### Warnings vs Errors

Warnings are non-fatal issues recorded in `RouteResult.warnings`. They do not prevent the route from succeeding:

- `FALLBACK_PARSER`: A lower-quality parser was used because the preferred parser is not installed.
- `LEGACY_FORMAT`: A legacy format was detected. The file may still be processable with reduced quality.
- `PARTIAL_PARSE`: Some content was lost during parsing. The result is usable but incomplete.
- `NO_TEXT_EXTRACTED`: The file contained no extractable text. The result has an empty content string.
- `OCR_UNAVAILABLE`: An image was encountered but OCR is not enabled or not installed.
- `LARGE_FILE`: The file exceeds the recommended size. Processing completed but may have been slow.
- `ENCODING_ISSUE`: Non-UTF-8 encoding was detected and converted with possible character loss.

Errors are fatal issues that prevent the route from completing. They are thrown (for `route()`) or captured in `RouteError` objects (for batch processing).

---

## 21. File Structure

```
ai-file-router/
  package.json
  tsconfig.json
  SPEC.md
  README.md
  src/
    index.ts                         -- Public API exports (route, routeBatch, routeDirectory, detectFormat, createRouter)
    route.ts                         -- route() function, pipeline orchestration
    batch.ts                         -- routeBatch() and routeDirectory() functions
    factory.ts                       -- createRouter() factory
    types.ts                         -- All TypeScript type definitions
    errors.ts                        -- Error classes (InputError, FormatDetectionError, UnsupportedFormatError, ParseError)
    detection/
      index.ts                       -- detectFormat() function, orchestration of detection signals
      magic-bytes.ts                 -- Magic byte signature matching
      extension-map.ts               -- File extension to format mapping
      mime-map.ts                    -- MIME type to format mapping
      zip-disambiguator.ts           -- ZIP-based format disambiguation (DOCX/PPTX/XLSX/ODT)
      content-heuristic.ts           -- Heuristic content inspection for extensionless text inputs
    registry/
      index.ts                       -- ParserRegistry class
      builtin-parsers.ts             -- Built-in parser registration
      docling-detection.ts           -- docling-node-ts availability detection
    parsers/
      pdf-fallback.ts                -- PDF fallback parser (pdf-parse wrapper)
      docx-fallback.ts               -- DOCX fallback parser (mammoth wrapper)
      pptx-fallback.ts               -- PPTX fallback parser (jszip + XML)
      html-fallback.ts               -- HTML fallback parser (cheerio + readability)
      xlsx-parser.ts                 -- XLSX parser (SheetJS wrapper)
      csv-parser.ts                  -- CSV/TSV parser (RFC 4180)
      json-parser.ts                 -- JSON parser (pretty-print + code fence)
      yaml-parser.ts                 -- YAML parser (passthrough + code fence)
      toml-parser.ts                 -- TOML parser (passthrough + code fence)
      xml-parser.ts                  -- XML parser (formatted text)
      markdown-parser.ts             -- Markdown passthrough + cleanup
      rst-parser.ts                  -- reStructuredText to markdown converter
      rtf-parser.ts                  -- RTF text extractor
      odt-parser.ts                  -- ODT parser (jszip + ODF XML)
      code-parser.ts                 -- Code file wrapper (language detection, code fence, comment extraction)
      image-parser.ts                -- Image handler (placeholder or OCR)
      text-parser.ts                 -- Plain text passthrough + cleanup
    postprocess/
      cleanup.ts                     -- Output cleanup (whitespace, encoding, BOM, null bytes)
    cli.ts                           -- CLI entry point
  src/__tests__/
    route.test.ts                    -- Main route() function tests
    batch.test.ts                    -- routeBatch() and routeDirectory() tests
    factory.test.ts                  -- createRouter() tests
    detection/
      magic-bytes.test.ts            -- Magic byte detection tests
      extension-map.test.ts          -- Extension mapping tests
      mime-map.test.ts               -- MIME type mapping tests
      zip-disambiguator.test.ts      -- ZIP disambiguation tests
      content-heuristic.test.ts      -- Content heuristic tests
    registry/
      registry.test.ts               -- Parser registry tests
    parsers/
      csv-parser.test.ts             -- CSV parser tests
      xlsx-parser.test.ts            -- XLSX parser tests
      code-parser.test.ts            -- Code parser tests
      json-parser.test.ts            -- JSON parser tests
      image-parser.test.ts           -- Image parser tests
      html-fallback.test.ts          -- HTML fallback parser tests
      markdown-parser.test.ts        -- Markdown passthrough tests
      rst-parser.test.ts             -- RST parser tests
    postprocess/
      cleanup.test.ts                -- Cleanup tests
    integration/
      full-pipeline.test.ts          -- End-to-end pipeline tests
      docling-integration.test.ts    -- docling-node-ts integration tests
      batch.test.ts                  -- Batch processing integration tests
      directory.test.ts              -- Directory scanning integration tests
    cli.test.ts                      -- CLI tests
    fixtures/
      pdf/                           -- PDF test files
      docx/                          -- DOCX test files
      xlsx/                          -- XLSX test files
      csv/                           -- CSV test files
      code/                          -- Source code test files
      images/                        -- Image test files
      html/                          -- HTML test files
      json/                          -- JSON test files
      mixed/                         -- Mixed-format directory for directory tests
  dist/                              -- Compiled output (generated by tsc)
```

---

## 22. Implementation Roadmap

### Phase 1: Core Infrastructure and Text Formats (v0.1.0)

Implement the foundation: types, format detection, the routing pipeline skeleton, parsers for simple text-based formats, and the CLI skeleton.

1. **Types**: Define all TypeScript types in `types.ts` -- `RouteResult`, `RouteOptions`, `FormatInfo`, `DocumentMetadata`, `BatchResult`, `FileRouter`, `ParserFn`, `RouterConfig`, and all error classes.
2. **Format detection**: Implement `detectFormat()` with magic byte checking (using `file-type`), extension mapping, MIME type mapping, and ZIP disambiguation in the `detection/` module.
3. **Parser registry**: Implement the `ParserRegistry` class with priority-based parser registration and lookup.
4. **Post-processing**: Implement the cleanup module (whitespace normalization, BOM removal, null byte stripping).
5. **Text parsers**: Implement parsers for plain text (passthrough), markdown (passthrough + cleanup), JSON (pretty-print + code fence), YAML (code fence), TOML (code fence), and code files (language detection + code fence wrapping).
6. **route() orchestration**: Wire up the pipeline: read input, detect format, select parser, invoke parser, post-process, build `RouteResult`.
7. **CLI skeleton**: Implement basic CLI argument parsing, single-file routing, and stdout output.
8. **Tests**: Format detection tests, parser registry tests, text parser tests, post-processing tests, CLI tests.

### Phase 2: Tabular and Web Formats (v0.2.0)

Add parsers for CSV, TSV, XLSX, HTML, and XML.

1. **CSV parser**: Implement RFC 4180-compliant CSV parsing with configurable delimiter, header detection, and markdown table output.
2. **TSV parser**: Extend CSV parser with tab delimiter.
3. **XLSX parser**: Implement XLSX parsing using SheetJS with per-sheet sections and markdown table output.
4. **HTML fallback parser**: Implement HTML-to-markdown conversion using `cheerio` with readability-based article extraction.
5. **XML parser**: Implement formatted text representation of XML documents.
6. **Tests**: CSV parsing tests (RFC 4180 edge cases), XLSX tests, HTML tests, XML tests.

### Phase 3: Document Formats and docling Integration (v0.3.0)

Add document format fallback parsers and integrate with `docling-node-ts`.

1. **docling-node-ts detection**: Implement dynamic import detection for `docling-node-ts` availability.
2. **docling-node-ts parser registration**: When available, register `docling-node-ts` parsers for PDF, DOCX, PPTX, and HTML with `docling` priority.
3. **PDF fallback parser**: Implement basic PDF text extraction using `pdf-parse`.
4. **DOCX fallback parser**: Implement DOCX-to-markdown conversion using `mammoth` (via HTML intermediate) or `jszip` + XML reading.
5. **PPTX fallback parser**: Implement slide text extraction using `jszip` + slide XML parsing.
6. **ODT parser**: Implement ODT text extraction using `jszip` + ODF XML parsing.
7. **RTF parser**: Implement basic RTF text extraction.
8. **RST parser**: Implement reStructuredText-to-markdown conversion.
9. **Tests**: Document format tests, docling integration tests, fallback parser quality tests.

### Phase 4: Image Handling and Batch Processing (v0.4.0)

Add image handling with optional OCR, batch processing, and directory scanning.

1. **Image placeholder parser**: Implement header-based dimension extraction and placeholder string generation for PNG, JPEG, GIF, WEBP, BMP, and TIFF.
2. **SVG text extraction**: Implement text extraction from SVG XML elements.
3. **OCR integration**: Implement optional `tesseract.js` integration for image OCR.
4. **routeBatch()**: Implement parallel batch processing with configurable concurrency, progress callbacks, and per-file error handling.
5. **routeDirectory()**: Implement recursive directory scanning with glob-based include/exclude, size limits, and file count limits.
6. **CLI batch mode**: Extend the CLI with directory processing, `--recursive`, `--include`, `--exclude`, and progress output.
7. **Tests**: Image parser tests, OCR integration tests (requires `tesseract.js`), batch processing tests, directory scanning tests.

### Phase 5: Polish and v1.0.0

1. **Custom parser registration API**: Finalize `router.register()` and `router.listFormats()`.
2. **createRouter() factory**: Implement the factory with preset merging and configuration precedence.
3. **CLI completion**: Add `--json`, `--detect`, `--verbose`, `--quiet`, environment variable support.
4. **Performance benchmarks**: Measure routing overhead, parser performance, and batch throughput. Optimize hot paths.
5. **Documentation**: Write README with usage examples, format support table, and integration guides.
6. **Edge case hardening**: Handle all edge cases listed in the testing strategy (empty files, corrupted formats, encoding issues, very large files).
7. **v1.0.0 release**.

---

## 23. Example Use Cases

### RAG File Upload Handler

A backend API receives file uploads from users and ingests them into a vector database.

```typescript
import express from 'express';
import multer from 'multer';
import { route } from 'ai-file-router';
import { chunk } from 'chunk-smart';
import { createEmbedCache } from 'embed-cache';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const embedCache = createEmbedCache({ provider: 'openai', model: 'text-embedding-3-small' });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const { content, metadata, warnings } = await route(req.file.buffer, {
    mimeType: req.file.mimetype,
    fileName: req.file.originalname,
  });

  const chunks = chunk(content, { maxChunkSize: 512 });
  const embeddings = await Promise.all(chunks.map(c => embedCache.embed(c.content)));

  await vectorDb.insert(chunks.map((c, i) => ({
    text: c.content,
    embedding: embeddings[i],
    metadata: { source: metadata.fileName, format: metadata.extra?.sourceFormat },
  })));

  res.json({
    fileName: metadata.fileName,
    format: metadata.extra?.sourceFormat,
    wordCount: metadata.wordCount,
    chunks: chunks.length,
    warnings: warnings.map(w => w.message),
  });
});
```

### Knowledge Base Ingestion Script

A script that ingests an entire directory of mixed-format documents into a knowledge base.

```typescript
import { routeDirectory } from 'ai-file-router';
import { chunk } from 'chunk-smart';

async function ingestKnowledgeBase(dirPath: string) {
  const results = await routeDirectory(dirPath, {
    recursive: true,
    include: ['*.pdf', '*.docx', '*.md', '*.csv', '*.html', '*.json', '*.py', '*.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    concurrency: 5,
    onProgress: (p) => {
      console.log(`[${p.index + 1}/${p.total}] ${p.status}: ${p.file}`);
    },
  });

  console.log(`\nProcessed ${results.succeeded}/${results.totalFiles} files in ${results.durationMs}ms`);
  if (results.failed > 0) {
    console.warn(`${results.failed} files failed`);
  }

  const allChunks = results.results.flatMap(result => {
    if (!('content' in result)) return [];
    return chunk(result.content, {
      maxChunkSize: 512,
      customMetadata: { source: result.metadata.fileName },
    });
  });

  console.log(`Total chunks: ${allChunks.length}`);
  return allChunks;
}
```

### Document Processing API with Format Detection

An API that detects the format of uploaded files before processing, providing format information to the client.

```typescript
import { detectFormat, route } from 'ai-file-router';

// Detection endpoint
app.post('/api/detect', upload.single('file'), async (req, res) => {
  const info = await detectFormat(req.file.buffer, {
    mimeType: req.file.mimetype,
    fileName: req.file.originalname,
  });

  res.json({
    format: info.format,
    confidence: info.confidence,
    method: info.method,
    language: info.language,
    supported: info.format !== 'unknown',
  });
});

// Processing endpoint
app.post('/api/process', upload.single('file'), async (req, res) => {
  const result = await route(req.file.buffer, {
    mimeType: req.file.mimetype,
    fileName: req.file.originalname,
    imageOptions: { ocr: true },
    codeOptions: { extractComments: true },
  });

  res.json({
    content: result.content,
    format: result.sourceFormat,
    outputFormat: result.outputFormat,
    metadata: result.metadata,
    parserUsed: result.parserUsed,
    durationMs: result.durationMs,
  });
});
```

### CLI Batch Converter

Converting a directory of mixed documents to markdown files from the command line.

```bash
# Convert all documents in a directory, outputting markdown files
ai-file-router ./company-docs/ -r -o ./markdown-output/ \
  --include '*.pdf' --include '*.docx' --include '*.pptx' --include '*.html' \
  --concurrency 10 --verbose

# Detect formats without processing
ai-file-router ./unknown-files/ -r --detect

# Process images with OCR
ai-file-router ./scanned-documents/ -r --ocr --ocr-lang eng -o ./extracted-text/

# Export full RouteResult metadata as JSON
ai-file-router report.pdf --json > report-metadata.json
```
