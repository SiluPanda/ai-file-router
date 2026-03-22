# ai-file-router -- Implementation Tasks

This file tracks all implementation tasks derived from SPEC.md. Each task is granular, actionable, and grouped by logical phase.

---

## Phase 1: Project Setup and Core Infrastructure

### 1.1 Project Scaffolding

- [ ] **Install runtime dependencies** -- Add `file-type`, `cheerio`, `xlsx`, and `jszip` to `dependencies` in package.json. | Status: not_done
- [x] **Install dev dependencies** -- Add `typescript`, `vitest`, `eslint`, `@types/node`, and any needed ESLint plugins to `devDependencies`. | Status: done
- [ ] **Configure optional peer dependencies** -- Add `docling-node-ts`, `tesseract.js`, `mammoth`, and `pdf-parse` as `peerDependencies` with `peerDependenciesMeta` marking each as optional. | Status: not_done
- [ ] **Add CLI bin entry** -- Add `"bin": { "ai-file-router": "dist/cli.js" }` to package.json. | Status: not_done
- [ ] **Create source directory structure** -- Create all directories specified in Section 21: `src/detection/`, `src/registry/`, `src/parsers/`, `src/postprocess/`, and `src/__tests__/` with subdirectories (`detection/`, `registry/`, `parsers/`, `postprocess/`, `integration/`, `fixtures/`). | Status: not_done
- [ ] **Create test fixture directories** -- Create `src/__tests__/fixtures/` subdirectories for each format: `pdf/`, `docx/`, `xlsx/`, `csv/`, `code/`, `images/`, `html/`, `json/`, `mixed/`. | Status: not_done

### 1.2 TypeScript Type Definitions (`src/types.ts`)

- [ ] **Define FileInput type** -- `type FileInput = string | Buffer | URL | ReadableStream<Uint8Array>` as specified in Section 13. | Status: not_done
- [ ] **Define SourceFormat type** -- Union type of all supported format identifiers (`'pdf' | 'docx' | 'pptx' | ...`) plus extensible `string`. | Status: not_done
- [x] **Define RouteResult interface** -- Fields: `content`, `outputFormat`, `sourceFormat`, `detection`, `metadata`, `warnings`, `durationMs`, `parserUsed` per Section 8.1. | Status: done
- [x] **Define FormatInfo interface** -- Fields: `format`, `confidence`, `method`, `language?`, `subtype?` per Section 9 (Step 2). | Status: done
- [ ] **Define DocumentMetadata interface** -- Fields: `fileName?`, `fileSize?`, `title?`, `author?`, `createdDate?`, `modifiedDate?`, `pageCount?`, `wordCount`, `charCount`, `language?`, `dimensions?`, `sheetNames?`, `extra?` per Section 8.3. | Status: not_done
- [ ] **Define RouteWarning interface** -- Fields: `code`, `message` per Section 8.4. | Status: not_done
- [x] **Define RouteOptions interface** -- Fields: `format?`, `mimeType?`, `fileName?`, `outputFormat?`, `imageOptions?`, `codeOptions?`, `csvOptions?`, `doclingOptions?`, `signal?` per Section 13. | Status: done
- [ ] **Define ImageOptions interface** -- Fields: `ocr?`, `ocrLanguage?`, `ocrMinLength?` per Section 11.1. | Status: not_done
- [x] **Define CodeOptions interface** -- Fields: `extractComments?`, `includeHeader?` per Section 10. | Status: done
- [ ] **Define CsvOptions interface** -- Fields: `hasHeader?`, `delimiter?`, `maxRows?` per Section 13. | Status: not_done
- [ ] **Define ParserFn type** -- `(input: ParserInput, options: ParserOptions) => Promise<ParserOutput>` per Section 7.4. | Status: not_done
- [x] **Define ParserInput interface** -- Fields: `buffer`, `filePath?`, `fileName?`, `mimeType?` per Section 7.4. | Status: done
- [x] **Define ParserOutput interface** -- Fields: `content`, `format`, `metadata?`, `warnings?` per Section 7.4. | Status: done
- [ ] **Define ParserEntry interface** -- Fields: `priority`, `parser`, `label` per Section 7.1. | Status: not_done
- [x] **Define BatchOptions interface** -- Extends `RouteOptions` with `concurrency?`, `failFast?`, `onProgress?` per Section 12.1. | Status: done
- [ ] **Define BatchResult interface** -- Fields: `results`, `totalFiles`, `succeeded`, `failed`, `durationMs` per Section 12.1. | Status: not_done
- [ ] **Define BatchProgress interface** -- Fields: `index`, `total`, `status`, `file?` per Section 12.1. | Status: not_done
- [ ] **Define RouteError interface** -- Fields: `success: false`, `error`, `file?` per Section 12.1. | Status: not_done
- [ ] **Define DirectoryOptions interface** -- Extends `BatchOptions` with `recursive?`, `include?`, `exclude?`, `maxFileSize?`, `maxFiles?` per Section 12.2. | Status: not_done
- [ ] **Define RouterConfig interface** -- Fields: `preferDocling?`, `defaultOutputFormat?`, `imageOptions?`, `codeOptions?`, `csvOptions?`, `concurrency?`, `doclingOptions?` per Section 13. | Status: not_done
- [ ] **Define FileRouter interface** -- Methods: `route()`, `routeBatch()`, `routeDirectory()`, `detectFormat()`, `register()`, `listFormats()` per Section 13. | Status: not_done
- [ ] **Define FormatRegistration interface** -- Fields: `format`, `parsers` per Section 13. | Status: not_done

### 1.3 Error Classes (`src/errors.ts`)

- [ ] **Implement InputError class** -- Error class with `code: 'INPUT_ERROR'` for file-not-found, URL-unreachable, permission-denied, stream-read-failure scenarios per Section 20. | Status: not_done
- [ ] **Implement FormatDetectionError class** -- Error class with `code: 'FORMAT_DETECTION_FAILED'` for when format cannot be determined per Section 20. | Status: not_done
- [ ] **Implement UnsupportedFormatError class** -- Error class with `code: 'UNSUPPORTED_FORMAT'` and `format` field for when no parser is registered per Section 20. | Status: not_done
- [ ] **Implement ParseError class** -- Error class with `code: 'PARSE_FAILED'`, `format` field, and `cause` field wrapping the original parser error per Section 20. | Status: not_done

---

## Phase 2: Format Detection (`src/detection/`)

### 2.1 Magic Bytes Detection (`src/detection/magic-bytes.ts`)

- [x] **Implement magic byte signature matching** -- Check the first N bytes of a Buffer against known file signatures using `file-type` library. Return format identifier and confidence per Section 5.2. | Status: done
- [x] **Handle PDF signature** -- Detect `%PDF` (0x25504446) at offset 0 with confidence 1.0. | Status: done
- [x] **Handle ZIP signature** -- Detect `PK` (0x504B0304) at offset 0 with confidence 0.9 (ambiguous -- requires ZIP disambiguation). | Status: done
- [x] **Handle PNG signature** -- Detect 8-byte PNG header at offset 0 with confidence 1.0. | Status: done
- [x] **Handle JPEG signature** -- Detect `FF D8 FF` at offset 0 with confidence 1.0. | Status: done
- [x] **Handle GIF signature** -- Detect `GIF8` at offset 0 with confidence 1.0. | Status: done
- [x] **Handle WEBP signature** -- Detect `RIFF....WEBP` pattern with confidence 1.0. | Status: done
- [x] **Handle TIFF signature** -- Detect little-endian `II*` or big-endian `MM*` at offset 0 with confidence 1.0. | Status: done
- [x] **Handle BMP signature** -- Detect `BM` at offset 0 with confidence 1.0. | Status: done
- [x] **Handle RTF signature** -- Detect `{\rtf` at offset 0 with confidence 1.0. | Status: done
- [x] **Handle GZIP signature** -- Detect `1F 8B` at offset 0 (noted for future decompression support). | Status: done

### 2.2 ZIP-Based Format Disambiguation (`src/detection/zip-disambiguator.ts`)

- [ ] **Read [Content_Types].xml from ZIP archive** -- Use `jszip` to open a ZIP buffer and read `[Content_Types].xml` per Section 5.3. | Status: not_done
- [ ] **Detect DOCX** -- Check for `application/vnd.openxmlformats-officedocument.wordprocessingml` in Content_Types. | Status: not_done
- [ ] **Detect PPTX** -- Check for `application/vnd.openxmlformats-officedocument.presentationml` in Content_Types. | Status: not_done
- [ ] **Detect XLSX** -- Check for `application/vnd.openxmlformats-officedocument.spreadsheetml` in Content_Types. | Status: not_done
- [ ] **Detect ODT** -- Check for `application/vnd.oasis.opendocument.text` in Content_Types. | Status: not_done
- [ ] **Detect ODS** -- Check for `application/vnd.oasis.opendocument.spreadsheet` in Content_Types. | Status: not_done
- [x] **Handle unrecognized ZIP** -- If Content_Types.xml is missing or doesn't match known types, report as `'unknown'` per Section 5.3. | Status: done
- [ ] **Handle corrupted ZIP** -- Fall back to extension-based detection when ZIP cannot be read. | Status: not_done

### 2.3 Extension Mapping (`src/detection/extension-map.ts`)

- [x] **Build complete extension-to-format mapping** -- Implement the full mapping table from Section 5.4 covering all document, spreadsheet, web, markup, data, code, image, and text extensions. Confidence 0.6. | Status: done
- [x] **Handle document extensions** -- `.pdf`, `.docx`, `.doc`, `.pptx`, `.ppt`, `.xlsx`, `.xls`, `.rtf`, `.odt`. | Status: done
- [x] **Handle spreadsheet extensions** -- `.csv`, `.tsv`. | Status: done
- [x] **Handle web/markup extensions** -- `.html`, `.htm`, `.xml`, `.md`, `.markdown`, `.rst`. | Status: done
- [x] **Handle data format extensions** -- `.json`, `.yaml`, `.yml`, `.toml`. | Status: done
- [x] **Handle code file extensions** -- All 40+ code file extensions listed in Section 5.4 (`.js`, `.ts`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, `.rb`, `.php`, `.swift`, `.kt`, `.scala`, `.sh`, `.sql`, `.r`, `.lua`, `.pl`, `.ex`, `.hs`, `.dart`, `.vue`, `.svelte`, `.css`, `.scss`, `.less`, `.graphql`, `.proto`, `.tf`, `.dockerfile`, `.makefile`, etc.) with corresponding language identifiers. | Status: done
- [x] **Handle image extensions** -- `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.tiff`, `.tif`, `.bmp`, `.svg`. | Status: done
- [x] **Handle plain text extensions** -- `.txt`, `.log`. | Status: done
- [ ] **Handle legacy format extensions with warnings** -- `.doc`, `.xls`, `.ppt` should be detected and emit `LEGACY_FORMAT` warning per Section 5.6. | Status: not_done
- [x] **Handle special filenames** -- `Dockerfile`, `Makefile` (no extension, matched by full filename). | Status: done

### 2.4 MIME Type Mapping (`src/detection/mime-map.ts`)

- [x] **Build MIME-type-to-format mapping** -- Implement the full MIME type mapping table from Section 5.5. Confidence 0.8. | Status: done
- [x] **Handle application MIME types** -- `application/pdf`, `application/vnd.openxmlformats-*`, `application/json`, `application/xml`, `application/rtf`, `application/x-yaml`. | Status: done
- [x] **Handle text MIME types** -- `text/html`, `text/xml`, `text/markdown`, `text/csv`, `text/tab-separated-values`, `text/yaml`, `text/plain`. | Status: done
- [x] **Handle image MIME types** -- `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/tiff`, `image/bmp`, `image/svg+xml`. | Status: done
- [x] **Ignore application/octet-stream** -- Fall through to other detection signals when MIME type is `application/octet-stream` per Section 5.5. | Status: done

### 2.5 Content Heuristic Detection (`src/detection/content-heuristic.ts`)

- [x] **Implement text-based format heuristics** -- For buffers with no extension and no binary magic bytes, inspect content for JSON braces, HTML tags, YAML indicators, markdown headers. Confidence 0.5 per Section 5.6. | Status: done
- [x] **Detect JSON content** -- Check for leading `{` or `[` after whitespace trimming. | Status: done
- [x] **Detect HTML content** -- Check for `<!DOCTYPE html>`, `<html`, or common HTML tags. | Status: done
- [x] **Detect YAML content** -- Check for `---` at start or YAML-style `key: value` patterns. | Status: done
- [x] **Detect Markdown content** -- Check for `#` headings, `---` frontmatter, markdown-style links. | Status: done
- [x] **Default to plain text** -- If no heuristic matches, treat as plain text. | Status: done

### 2.6 Detection Orchestrator (`src/detection/index.ts`)

- [x] **Implement detectFormat() function** -- Orchestrate the four detection signals in priority order: explicit format > magic bytes > MIME type > extension, per Section 5.1. | Status: done
- [x] **Handle explicit format override** -- When `options.format` is provided, return it with confidence 1.0 and method `'explicit'`. | Status: done
- [ ] **Handle signal agreement boosting** -- When multiple signals agree, boost confidence to the maximum per Section 5.1. | Status: not_done
- [x] **Handle signal disagreement** -- When signals disagree, use the higher-priority signal per Section 5.1. | Status: done
- [x] **Handle content heuristic fallback** -- For buffers with no magic bytes and no extension, invoke content heuristic detection per Section 5.6. | Status: done
- [ ] **Throw FormatDetectionError on failure** -- When no signal produces a result, throw `FormatDetectionError`. | Status: not_done

---

## Phase 3: Parser Registry (`src/registry/`)

### 3.1 Parser Registry Class (`src/registry/index.ts`)

- [x] **Implement ParserRegistry class** -- `Map<string, ParserEntry[]>` with methods for registration, lookup, and listing per Section 7.1. | Status: done
- [x] **Implement register() method** -- Register a parser for a format with a given priority. Custom parsers replace previous custom parsers per Section 7.4. | Status: done
- [x] **Implement getParser() method** -- Look up the highest-priority parser for a format. Sort entries by priority: `custom` > `docling` > `builtin`. Throw `UnsupportedFormatError` if no parser found per Section 7.5. | Status: done
- [x] **Implement listFormats() method** -- Return all registered formats with their parser tiers per `FormatRegistration` interface. | Status: done

### 3.2 Built-in Parser Registration (`src/registry/builtin-parsers.ts`)

- [x] **Register all built-in parsers** -- Register parsers for all 18 built-in formats (pdf, docx, pptx, html, xlsx, csv, tsv, json, yaml, toml, xml, markdown, rst, rtf, odt, code, image, text) with priority `'builtin'` per Section 7.2. | Status: done

### 3.3 docling-node-ts Detection (`src/registry/docling-detection.ts`)

- [ ] **Implement docling availability detection** -- Use dynamic `import()` in try/catch at router creation time to detect `docling-node-ts` availability. Cache the result per Section 7.3. | Status: not_done
- [ ] **Register docling parsers when available** -- Register docling parsers for `pdf`, `docx`, `pptx`, and `html` with priority `'docling'` per Section 7.3. | Status: not_done
- [ ] **Implement docling parser wrapper** -- Wrap `docling-node-ts` `convert()` calls, extracting the markdown string and merging metadata into `ParserOutput` per Section 7.3. | Status: not_done

---

## Phase 4: Post-Processing (`src/postprocess/`)

### 4.1 Output Cleanup (`src/postprocess/cleanup.ts`)

- [x] **Implement whitespace normalization** -- Collapse more than two consecutive blank lines to exactly two. Remove trailing whitespace from every line. Ensure content ends with exactly one newline per Section 8.5 and Step 5 of Section 9. | Status: done
- [ ] **Implement null byte and control character removal** -- Strip null bytes (`\0`) and control characters (ASCII 0-31 except `\n` and `\t`) per Section 8.5. | Status: not_done
- [ ] **Implement BOM removal** -- Remove UTF-8 byte-order mark from the beginning of content per Section 9 Step 5. | Status: not_done
- [ ] **Implement encoding normalization** -- Detect non-UTF-8 sequences, attempt conversion, and emit `ENCODING_ISSUE` warning per Section 9 Step 5. | Status: not_done

---

## Phase 5: Built-in Parsers -- Text Formats (`src/parsers/`)

### 5.1 Plain Text Parser (`src/parsers/text-parser.ts`)

- [x] **Implement text passthrough parser** -- Read file content, normalize CRLF to LF, remove trailing whitespace, terminate with single newline. Return `outputFormat: 'text'` per Section 6.8. | Status: done

### 5.2 Markdown Parser (`src/parsers/markdown-parser.ts`)

- [x] **Implement markdown passthrough parser** -- Read markdown content, normalize whitespace, consistent line endings, remove trailing spaces. Return `outputFormat: 'markdown'` per Section 6.4 (Markdown). | Status: done

### 5.3 JSON Parser (`src/parsers/json-parser.ts`)

- [x] **Implement JSON parser** -- Parse JSON, pretty-print with 2-space indentation, wrap in a markdown fenced code block with `json` language tag per Section 6.5 (JSON). | Status: done
- [x] **Handle large JSON files** -- For files exceeding configurable threshold (default 10KB), summarize structure: list top-level keys, show array lengths, truncate deep nesting with `...` per Section 6.5. | Status: done

### 5.4 YAML Parser (`src/parsers/yaml-parser.ts`)

- [x] **Implement YAML parser** -- Wrap YAML content in a markdown fenced code block with `yaml` language tag. Preserve multi-document separators per Section 6.5 (YAML). | Status: done
- [ ] **Handle large YAML files** -- Summarize large files rather than including verbatim per Section 6.5. | Status: not_done

### 5.5 TOML Parser (`src/parsers/toml-parser.ts`)

- [x] **Implement TOML parser** -- Wrap TOML content in a markdown fenced code block with `toml` language tag per Section 6.5 (TOML). | Status: done

### 5.6 Code Parser (`src/parsers/code-parser.ts`)

- [x] **Implement code fence wrapping** -- Wrap source code in a markdown fenced code block with the detected language tag per Section 6.6. | Status: done
- [ ] **Handle code containing triple backticks** -- Use quadruple backticks for the fence when source code contains triple backticks per Section 10.2. | Status: not_done
- [x] **Implement language detection from extension** -- Map file extension to language tag using the extension mapping table per Section 10.1. | Status: done
- [ ] **Implement language detection from content (shebang)** -- Detect language from shebang lines (`#!/usr/bin/env python3`, `#!/bin/bash`) per Section 10.1. | Status: not_done
- [ ] **Implement language detection from content (syntax patterns)** -- Detect language from syntax patterns (`import React`, `def `, `fn main()`, `package main`, `public class`) per Section 10.1. | Status: not_done
- [ ] **Implement optional comment extraction** -- When `codeOptions.extractComments` is true, extract block comments and docstrings into a separate `## Documentation Comments` section. Support `/* */`, `""" """`, `# ...`, `-- ...` per Section 10.3. | Status: not_done
- [x] **Implement optional file metadata header** -- When `codeOptions.includeHeader` is true, prepend `## File: <path> (<Language>)` header per Section 10.4. | Status: done

---

## Phase 6: Built-in Parsers -- Tabular and Web Formats

### 6.1 CSV Parser (`src/parsers/csv-parser.ts`)

- [x] **Implement RFC 4180-compliant CSV parser** -- Parse CSV with proper handling of quoted fields, escaped quotes, and multiline fields per Section 6.2 (CSV). | Status: done
- [x] **Convert CSV to markdown GFM table** -- Generate a GFM-style markdown table with headers from the first row per Section 6.2. | Status: done
- [ ] **Support configurable header row** -- Respect `csvOptions.hasHeader` (default: true) per Section 13. | Status: not_done
- [x] **Support configurable delimiter** -- Respect `csvOptions.delimiter` with auto-detection (`,` for .csv, `\t` for .tsv) per Section 13. | Status: done
- [ ] **Support maximum row limit** -- Respect `csvOptions.maxRows` (default: 1000) per Section 13. | Status: not_done

### 6.2 TSV Parser (`src/parsers/csv-parser.ts`)

- [x] **Implement TSV parsing** -- Reuse the CSV parser with tab delimiter. Ensure `.tsv` files auto-detect tab delimiter per Section 6.2 (TSV). | Status: done

### 6.3 XLSX Parser (`src/parsers/xlsx-parser.ts`)

- [ ] **Implement XLSX parsing with SheetJS** -- Use `xlsx` library to read XLSX files. Iterate over worksheets per Section 6.2 (XLSX). | Status: not_done
- [ ] **Generate per-sheet markdown sections** -- Output `## Sheet: <SheetName>` heading followed by a GFM table for each worksheet per Section 6.2. | Status: not_done
- [ ] **Handle first row as header** -- Treat the first row of each sheet as the header row per Section 6.2. | Status: not_done
- [ ] **Handle formulas** -- Evaluate formulas to their cached values per Section 6.2. | Status: not_done
- [ ] **Populate sheetNames metadata** -- Add sheet names to `DocumentMetadata.sheetNames`. | Status: not_done

### 6.4 HTML Fallback Parser (`src/parsers/html-fallback.ts`)

- [x] **Implement HTML-to-markdown conversion with cheerio** -- Use `cheerio` to parse HTML and convert elements to markdown per Section 6.3 (HTML). | Status: done
- [x] **Implement readability-based article extraction** -- Strip navigation, ads, sidebars, scripts, and extract main content per Section 6.3. | Status: done
- [x] **Map HTML elements to markdown** -- Convert `h1-h6` to headings, `ul/ol` to lists, `table` to GFM tables, `a` to links, `img` to image references, `pre/code` to code blocks, `strong/em` to bold/italic per Section 6.3. | Status: done

### 6.5 XML Parser (`src/parsers/xml-parser.ts`)

- [x] **Implement XML formatted text output** -- Produce a clean, indented text representation of the XML tree structure. Preserve element tags and attributes per Section 6.3 (XML). Return `outputFormat: 'text'`. | Status: done

---

## Phase 7: Built-in Parsers -- Document Formats

### 7.1 PDF Fallback Parser (`src/parsers/pdf-fallback.ts`)

- [ ] **Implement PDF text extraction using pdf-parse** -- Wrap `pdf-parse` to extract raw text from PDFs. Return `outputFormat: 'markdown'` per Section 6.1 (PDF). | Status: not_done
- [ ] **Handle pdf-parse not installed** -- Dynamically import `pdf-parse`. If unavailable, throw a descriptive error explaining the peer dependency per Section 19. | Status: not_done
- [ ] **Extract PDF metadata** -- Populate `pageCount`, `title`, `author` from pdf-parse info object. | Status: not_done

### 7.2 DOCX Fallback Parser (`src/parsers/docx-fallback.ts`)

- [ ] **Implement DOCX-to-markdown via mammoth** -- Use `mammoth` to convert DOCX to HTML, then convert HTML to markdown per Section 6.1 (DOCX). | Status: not_done
- [ ] **Handle mammoth not installed** -- Dynamically import `mammoth`. If unavailable, fall back to jszip-based XML text extraction. | Status: not_done
- [ ] **Extract DOCX metadata** -- Populate `title`, `author` from document properties if accessible. | Status: not_done

### 7.3 PPTX Fallback Parser (`src/parsers/pptx-fallback.ts`)

- [ ] **Implement PPTX text extraction with jszip** -- Use `jszip` to read slide XML files, extract text from text boxes and tables per Section 6.1 (PPTX). | Status: not_done
- [ ] **Generate per-slide markdown sections** -- Output `## Slide N: <Title>` for each slide per Section 6.1. | Status: not_done
- [ ] **Extract optional speaker notes** -- Include speaker notes in the output if present per Section 6.1. | Status: not_done
- [ ] **Populate pageCount metadata** -- Set `metadata.pageCount` to the number of slides. | Status: not_done

### 7.4 ODT Parser (`src/parsers/odt-parser.ts`)

- [ ] **Implement ODT parsing with jszip** -- Use `jszip` to extract `content.xml` from the ODT ZIP archive. Parse ODF XML to extract headings, paragraphs, lists, and tables per Section 6.1 (ODT). Return `outputFormat: 'markdown'`. | Status: not_done

### 7.5 RTF Parser (`src/parsers/rtf-parser.ts`)

- [ ] **Implement RTF text extraction** -- Hand-written parser that handles RTF control words to extract plain text, paragraph breaks, and basic formatting (bold, italic) per Section 6.1 (RTF). Return `outputFormat: 'text'`. | Status: not_done

### 7.6 RST Parser (`src/parsers/rst-parser.ts`)

- [ ] **Implement reStructuredText-to-markdown converter** -- Convert RST underline-based headings to ATX-style markdown headings. Map code blocks, lists, tables, and inline formatting to markdown equivalents per Section 6.4 (RST). | Status: not_done
- [ ] **Handle RST directives** -- Convert common directives (`.. note::`, `.. warning::`, `.. code-block::`, `.. image::`, `.. toctree::`) to best-effort markdown or preserve as text per Section 6.4. | Status: not_done

---

## Phase 8: Built-in Parsers -- Image Handling

### 8.1 Image Placeholder Parser (`src/parsers/image-parser.ts`)

- [ ] **Implement image placeholder generation** -- Generate `[Image: filename.png (WxH, SIZE, FORMAT)]` placeholder string per Section 11.2. | Status: not_done
- [ ] **Extract PNG dimensions** -- Read width and height from bytes 16-23 of IHDR chunk per Section 11.2. | Status: not_done
- [ ] **Extract JPEG dimensions** -- Read width and height from SOF0/SOF2 marker segment per Section 11.2. | Status: not_done
- [ ] **Extract GIF dimensions** -- Read width and height from bytes 6-9 per Section 11.2. | Status: not_done
- [ ] **Extract WEBP dimensions** -- Read width and height from VP8/VP8L chunk header per Section 11.2. | Status: not_done
- [ ] **Extract BMP dimensions** -- Read width and height from bytes 18-25 of DIB header per Section 11.2. | Status: not_done
- [ ] **Extract TIFF dimensions** -- Read width and height from IFD entries per Section 11.2. | Status: not_done
- [ ] **Handle corrupted image headers** -- Omit dimensions from placeholder when they cannot be extracted per Section 11.2. | Status: not_done
- [x] **Format file size** -- Display file size in human-readable format (KB, MB) per Section 11.2. | Status: done

### 8.2 SVG Text Extraction (`src/parsers/image-parser.ts`)

- [ ] **Implement SVG text extraction** -- Extract text from `<text>`, `<tspan>`, and `<title>` elements per Section 6.7 (SVG). | Status: not_done
- [ ] **Handle text-less SVGs** -- Return `[SVG Image: filename.svg]` placeholder when no text elements are found per Section 6.7. | Status: not_done

### 8.3 OCR Integration (`src/parsers/image-parser.ts`)

- [ ] **Implement tesseract.js OCR integration** -- When `imageOptions.ocr` is true, pass image Buffer to `tesseract.js` for text recognition per Section 11.1. | Status: not_done
- [ ] **Handle tesseract.js not installed** -- Emit `OCR_UNAVAILABLE` warning and fall back to placeholder mode per Section 8.4. | Status: not_done
- [ ] **Support configurable OCR language** -- Pass `imageOptions.ocrLanguage` (default: `'eng'`) to tesseract per Section 11.1. | Status: not_done
- [ ] **Apply minimum OCR text length threshold** -- If OCR text is below `imageOptions.ocrMinLength` (default: 10), emit `NO_TEXT_EXTRACTED` warning and return placeholder per Section 11.1. | Status: not_done
- [ ] **Clean up OCR output** -- Normalize whitespace, remove stray characters and noise artifacts per Section 11.1. | Status: not_done

---

## Phase 9: Routing Pipeline (`src/route.ts`)

### 9.1 Input Normalization (Step 1)

- [x] **Handle file path input** -- Detect string starting with `/`, `./`, or `C:\`. Read file with `fs.promises.readFile`. Extract file name and extension per Section 9 Step 1. | Status: done
- [ ] **Handle URL input** -- Detect string starting with `http://` or `https://`, or `URL` object. Fetch content with `fetch()`. Extract file name from URL path. Record `Content-Type` header per Section 9 Step 1. | Status: not_done
- [x] **Handle Buffer input** -- Use directly. No file name/extension unless provided in `options.fileName` per Section 9 Step 1. | Status: done
- [ ] **Handle ReadableStream input** -- Collect all chunks into a Buffer per Section 9 Step 1. | Status: not_done
- [x] **Throw InputError on read failure** -- File not found, URL unreachable, stream error per Section 9 Step 1. | Status: done

### 9.2 Pipeline Orchestration

- [x] **Implement route() function** -- Wire up the 6-step pipeline: read input, detect format, select parser, invoke parser, post-process, build RouteResult per Section 9. | Status: done
- [x] **Wrap parser invocation in try/catch** -- Catch parser errors and wrap in `ParseError` with format identifier per Section 9 Step 4. | Status: done
- [x] **Measure processing duration** -- Use `performance.now()` to measure total duration from Step 1 to Step 5 per Section 9 Step 6. | Status: done
- [x] **Compute word count and char count** -- Compute from the final post-processed content string per Section 9 Step 6. | Status: done
- [x] **Assemble RouteResult** -- Combine parser output, detection result, metadata, warnings, timing, and parserUsed label per Section 9 Step 6. | Status: done
- [ ] **Support AbortSignal** -- Check `options.signal` for external cancellation throughout the pipeline per Section 13. | Status: not_done

---

## Phase 10: Batch Processing (`src/batch.ts`)

### 10.1 routeBatch()

- [x] **Implement parallel batch processing** -- Process multiple files concurrently up to `concurrency` limit (default: 5) per Section 12.1. | Status: done
- [x] **Implement per-file error handling** -- Failed files produce `RouteError` objects instead of throwing. Other files continue processing per Section 12.1. | Status: done
- [ ] **Implement failFast mode** -- When `failFast` is true, stop processing on the first error per Section 12.1. | Status: not_done
- [ ] **Implement progress callback** -- Invoke `onProgress` after each file completes per Section 12.1. | Status: not_done
- [ ] **Maintain result ordering** -- Results are returned in the same order as inputs, regardless of processing order per Section 12.1. | Status: not_done
- [x] **Support mixed input types** -- Accept `Array<string | Buffer | { input: string | Buffer; options?: RouteOptions }>` per Section 12.1. | Status: done
- [x] **Build BatchResult** -- Compute `totalFiles`, `succeeded`, `failed`, `durationMs` per Section 12.1. | Status: done

### 10.2 routeDirectory()

- [x] **Implement recursive directory scanning** -- Use `fs.promises.readdir` with `recursive: true` (Node.js 18.17+) or recursive walk per Section 12.2. | Status: done
- [x] **Implement glob-based include patterns** -- Filter files matching `include` patterns per Section 12.2. | Status: done
- [x] **Implement glob-based exclude patterns** -- Skip files matching `exclude` patterns per Section 12.2. | Status: done
- [x] **Apply default exclusions** -- Skip `node_modules`, `.git`, `.svn`, `.hg`, `dist`, `build`, `__pycache__`, `.DS_Store`, `Thumbs.db`, `*.lock`, `package-lock.json`, `yarn.lock` per Section 12.2. | Status: done
- [ ] **Enforce maxFileSize limit** -- Skip files exceeding `maxFileSize` (default: 50MB) with `LARGE_FILE` warning per Section 12.2. | Status: not_done
- [ ] **Enforce maxFiles limit** -- Cap total files at `maxFiles` (default: 10000) per Section 12.2. | Status: not_done
- [ ] **Skip files with undetectable format** -- Skip files whose format cannot be detected, with a warning per Section 12.2. | Status: not_done
- [x] **Delegate to routeBatch** -- Use `routeBatch` internally with the configured concurrency per Section 12.2. | Status: done

---

## Phase 11: Router Factory (`src/factory.ts`)

- [ ] **Implement createRouter() factory** -- Create a configured `FileRouter` instance with preset options and custom parsers per Section 13. | Status: not_done
- [ ] **Implement configuration precedence** -- Merge options: per-call > factory-level > built-in defaults per Section 14. | Status: not_done
- [ ] **Implement router.register()** -- Allow custom parser registration on the router instance per Section 7.4. | Status: not_done
- [ ] **Implement router.listFormats()** -- Return all registered formats with their parser tiers per Section 13. | Status: not_done
- [ ] **Implement router.route()** -- Delegate to the `route()` function with merged options. | Status: not_done
- [ ] **Implement router.routeBatch()** -- Delegate to `routeBatch()` with merged options. | Status: not_done
- [ ] **Implement router.routeDirectory()** -- Delegate to `routeDirectory()` with merged options. | Status: not_done
- [ ] **Implement router.detectFormat()** -- Delegate to `detectFormat()`. | Status: not_done
- [ ] **Support preferDocling config** -- When `preferDocling: false`, skip docling parser registration even if available per Section 14. | Status: not_done

---

## Phase 12: Public API Exports (`src/index.ts`)

- [x] **Export route function** -- Top-level `route()` using a default router instance per Section 13. | Status: done
- [x] **Export routeBatch function** -- Top-level `routeBatch()` using a default router instance per Section 13. | Status: done
- [x] **Export routeDirectory function** -- Top-level `routeDirectory()` using a default router instance per Section 13. | Status: done
- [x] **Export detectFormat function** -- Top-level `detectFormat()` per Section 13. | Status: done
- [ ] **Export createRouter factory** -- Per Section 13. | Status: not_done
- [x] **Export all TypeScript types** -- Export all interfaces, types, and error classes for consumer use. | Status: done

---

## Phase 13: CLI (`src/cli.ts`)

### 13.1 Argument Parsing

- [ ] **Implement CLI argument parsing using util.parseArgs** -- Parse all flags from Section 15 using Node.js built-in `util.parseArgs` per Section 19 (no external CLI library). | Status: not_done
- [ ] **Parse input arguments** -- Accept one or more file paths, URLs, or directory path per Section 15. | Status: not_done
- [ ] **Parse output flags** -- `-o/--output`, `--stdout`, `--ext` per Section 15. | Status: not_done
- [ ] **Parse format flags** -- `-f/--format`, `--output-format` per Section 15. | Status: not_done
- [ ] **Parse batch/directory flags** -- `-r/--recursive`, `--include`, `--exclude`, `--concurrency`, `--max-files`, `--max-file-size` per Section 15. | Status: not_done
- [ ] **Parse image flags** -- `--ocr`, `--ocr-lang` per Section 15. | Status: not_done
- [ ] **Parse code flags** -- `--extract-comments`, `--include-header` per Section 15. | Status: not_done
- [ ] **Parse CSV flags** -- `--no-header`, `--delimiter`, `--max-rows` per Section 15. | Status: not_done
- [ ] **Parse general flags** -- `--detect`, `--json`, `--quiet`, `--verbose`, `--version`, `--help` per Section 15. | Status: not_done

### 13.2 Environment Variables

- [ ] **Support AI_FILE_ROUTER_CONCURRENCY** -- Fall back to environment variable when `--concurrency` is not provided per Section 15. | Status: not_done
- [ ] **Support AI_FILE_ROUTER_OCR** -- Fall back to env var (set to `1` or `true`) per Section 15. | Status: not_done
- [ ] **Support AI_FILE_ROUTER_OCR_LANG** -- Fall back to env var per Section 15. | Status: not_done
- [ ] **Support AI_FILE_ROUTER_OUTPUT_FORMAT** -- Fall back to env var per Section 15. | Status: not_done
- [ ] **Support AI_FILE_ROUTER_MAX_FILES** -- Fall back to env var per Section 15. | Status: not_done
- [ ] **Support AI_FILE_ROUTER_MAX_FILE_SIZE** -- Fall back to env var per Section 15. | Status: not_done

### 13.3 CLI Behavior

- [ ] **Implement single-file mode** -- Route a single file and write content to stdout per Section 15. | Status: not_done
- [ ] **Implement multi-file mode** -- Route multiple files and write each to output directory per Section 15. | Status: not_done
- [ ] **Implement directory mode** -- Use `routeDirectory` for directory input with `-r` flag per Section 15. | Status: not_done
- [ ] **Implement --detect mode** -- Detect format only, print `FormatInfo` to stdout per Section 15. | Status: not_done
- [ ] **Implement --json mode** -- Output full `RouteResult` as JSON instead of content only per Section 15. | Status: not_done
- [ ] **Implement --verbose mode** -- Show detailed processing progress per Section 15. | Status: not_done
- [ ] **Implement --quiet mode** -- Suppress warnings and status messages per Section 15. | Status: not_done
- [ ] **Implement --output file writing** -- Write output to a file instead of stdout per Section 15. | Status: not_done
- [ ] **Implement --output directory writing** -- For batch mode, write one output file per input with configured extension per Section 15. | Status: not_done
- [ ] **Add shebang line** -- Add `#!/usr/bin/env node` to the top of `cli.ts` for direct execution. | Status: not_done

### 13.4 CLI Error Handling and Exit Codes

- [ ] **Implement exit code 0** -- Success. All files processed successfully per Section 15. | Status: not_done
- [ ] **Implement exit code 1** -- Processing error. One or more files failed per Section 15. | Status: not_done
- [ ] **Implement exit code 2** -- Configuration error. Invalid flags, missing input, bad options per Section 15. | Status: not_done
- [ ] **Implement exit code 3** -- Input error. File not found, directory not accessible, URL unreachable per Section 15. | Status: not_done
- [ ] **Print human-readable error messages to stderr** -- Catch all errors and print user-friendly messages per Section 20. | Status: not_done
- [ ] **Implement --help output** -- Print usage documentation per Section 15. | Status: not_done
- [ ] **Implement --version output** -- Print package version from package.json per Section 15. | Status: not_done

---

## Phase 14: Unit Tests

### 14.1 Format Detection Tests (`src/__tests__/detection/`)

- [x] **Test magic byte detection for all signatures** -- Feed first N bytes of PDF, PNG, JPEG, GIF, WEBP, TIFF, BMP, RTF, ZIP and verify correct format identification per Section 17. | Status: done
- [x] **Test ZIP disambiguation** -- Create minimal DOCX, PPTX, XLSX ZIP buffers with appropriate Content_Types.xml and verify correct detection per Section 17. | Status: done
- [x] **Test extension mapping for all extensions** -- Verify every extension in Section 5.4 maps to the correct format per Section 17. | Status: done
- [x] **Test MIME type mapping** -- Verify every MIME type in Section 5.5 maps correctly per Section 17. | Status: done
- [x] **Test detection priority** -- Verify magic bytes override extension when they disagree per Section 17. | Status: done
- [x] **Test explicit format override** -- Verify `options.format` bypasses all detection with confidence 1.0 per Section 17. | Status: done
- [x] **Test content heuristic detection** -- Verify JSON, HTML, YAML, and Markdown heuristics on buffers without extensions per Section 17. | Status: done
- [ ] **Test legacy format warning** -- Verify `.doc`, `.xls`, `.ppt` emit `LEGACY_FORMAT` warning per Section 5.6. | Status: not_done

### 14.2 Parser Registry Tests (`src/__tests__/registry/registry.test.ts`)

- [x] **Test parser registration and lookup** -- Register parsers and verify correct lookup per Section 17. | Status: done
- [x] **Test priority ordering** -- Register custom, docling, and builtin parsers for same format and verify custom wins per Section 17. | Status: done
- [ ] **Test custom parser replacement** -- Register two custom parsers for the same format and verify the second replaces the first per Section 17. | Status: not_done
- [x] **Test listFormats()** -- Verify all registered formats and their tiers are returned per Section 17. | Status: done
- [ ] **Test UnsupportedFormatError** -- Verify error is thrown for unknown format per Section 17. | Status: not_done

### 14.3 Built-in Parser Tests (`src/__tests__/parsers/`)

- [x] **Test CSV parser -- basic parsing** -- Verify correct markdown table output for simple CSV per Section 17. | Status: done
- [x] **Test CSV parser -- RFC 4180 edge cases** -- Test quoted fields, escaped quotes, multiline fields, empty fields per Section 17. | Status: done
- [ ] **Test CSV parser -- configurable options** -- Test `hasHeader`, `delimiter`, `maxRows` per Section 17. | Status: not_done
- [ ] **Test XLSX parser** -- Verify per-sheet markdown table output per Section 17. | Status: not_done
- [x] **Test code parser -- language detection** -- Verify correct language tag for all major extensions per Section 17. | Status: done
- [x] **Test code parser -- code fence wrapping** -- Verify proper fencing including quadruple backtick case per Section 17. | Status: done
- [ ] **Test code parser -- comment extraction** -- Verify comment extraction for multiple languages per Section 17. | Status: not_done
- [x] **Test JSON parser -- pretty-print and code fence** -- Verify formatted JSON in code fence per Section 17. | Status: done
- [x] **Test JSON parser -- large file summarization** -- Verify structure summary for files exceeding threshold per Section 17. | Status: done
- [x] **Test image parser -- placeholder format** -- Verify `[Image: ...]` format with dimensions and file size per Section 17. | Status: done
- [ ] **Test image parser -- dimension extraction** -- Verify PNG, JPEG, GIF dimension extraction per Section 17. | Status: not_done
- [x] **Test text parser -- line ending normalization** -- Verify CRLF to LF, trailing whitespace removal per Section 17. | Status: done
- [x] **Test markdown parser -- passthrough** -- Verify content passes through with cleanup per Section 17. | Status: done
- [x] **Test HTML fallback parser** -- Verify HTML-to-markdown conversion per Section 17. | Status: done
- [ ] **Test RST parser** -- Verify RST-to-markdown heading conversion per Section 17. | Status: not_done
- [x] **Test YAML parser** -- Verify code fence wrapping per Section 17. | Status: done
- [x] **Test TOML parser** -- Verify code fence wrapping per Section 17. | Status: done

### 14.4 Post-Processing Tests (`src/__tests__/postprocess/cleanup.test.ts`)

- [ ] **Test whitespace normalization** -- Verify blank line collapsing, trailing whitespace removal, single-newline termination per Section 17. | Status: not_done
- [ ] **Test null byte removal** -- Verify null bytes and control characters are stripped per Section 17. | Status: not_done
- [ ] **Test BOM removal** -- Verify UTF-8 BOM is removed from content start per Section 17. | Status: not_done
- [ ] **Test encoding normalization** -- Verify non-UTF-8 detection and `ENCODING_ISSUE` warning per Section 17. | Status: not_done

### 14.5 Batch Processing Tests (`src/__tests__/batch.test.ts`)

- [x] **Test concurrency limiting** -- Verify no more than N files processed simultaneously per Section 17. | Status: done
- [x] **Test per-file error isolation** -- Verify one file's failure does not affect others per Section 17. | Status: done
- [ ] **Test progress callback invocation** -- Verify callback called for each file with correct progress info per Section 17. | Status: not_done
- [ ] **Test result ordering** -- Verify results match input order per Section 17. | Status: not_done
- [ ] **Test failFast behavior** -- Verify processing stops on first error when enabled per Section 17. | Status: not_done

### 14.6 Directory Scanning Tests

- [x] **Test recursive scanning** -- Verify files in subdirectories are found per Section 17. | Status: done
- [x] **Test include/exclude glob patterns** -- Verify correct filtering per Section 17. | Status: done
- [ ] **Test maxFileSize limit** -- Verify large files are skipped with warning per Section 17. | Status: not_done
- [ ] **Test maxFiles limit** -- Verify file count cap per Section 17. | Status: not_done
- [x] **Test default exclusions** -- Verify node_modules, .git, etc. are excluded per Section 17. | Status: done

### 14.7 CLI Tests (`src/__tests__/cli.test.ts`)

- [ ] **Test argument parsing** -- Verify all flags are parsed correctly per Section 17. | Status: not_done
- [ ] **Test environment variable fallback** -- Verify env vars are used when flags are absent per Section 17. | Status: not_done
- [ ] **Test flag precedence** -- Verify flags override env vars per Section 17. | Status: not_done
- [ ] **Test error messages for invalid input** -- Verify human-readable error output per Section 17. | Status: not_done
- [ ] **Test --help output** -- Verify help text is printed per Section 17. | Status: not_done
- [ ] **Test --version output** -- Verify version is printed per Section 17. | Status: not_done

### 14.8 Output Formatting Tests

- [x] **Test RouteResult structure** -- Verify all fields are populated correctly per Section 17. | Status: done
- [x] **Test metadata population** -- Verify wordCount, charCount, fileName, fileSize per Section 17. | Status: done
- [ ] **Test warning codes** -- Verify all warning codes from Section 8.4 are emitted in appropriate scenarios. | Status: not_done

---

## Phase 15: Integration Tests (`src/__tests__/integration/`)

### 15.1 Full Pipeline Integration Tests (`full-pipeline.test.ts`)

- [ ] **Test PDF routing end-to-end** -- Route a real PDF, verify `sourceFormat === 'pdf'`, `outputFormat === 'markdown'`, content contains text, metadata includes page count per Section 17. | Status: not_done
- [ ] **Test DOCX routing end-to-end** -- Route a real DOCX, verify structural markdown output per Section 17. | Status: not_done
- [x] **Test CSV routing end-to-end** -- Route a CSV, verify markdown table with correct headers and rows per Section 17. | Status: done
- [ ] **Test XLSX routing end-to-end** -- Route an XLSX, verify per-sheet markdown tables per Section 17. | Status: not_done
- [x] **Test code file routing end-to-end** -- Route a `.ts` file, verify markdown code fence with `typescript` tag per Section 17. | Status: done
- [x] **Test image placeholder routing** -- Route a PNG without OCR, verify placeholder format with dimensions per Section 17. | Status: done
- [ ] **Test image OCR routing** -- Route a PNG with OCR enabled (requires `tesseract.js`), verify extracted text per Section 17. | Status: not_done
- [x] **Test JSON routing end-to-end** -- Route a JSON file, verify pretty-printed code fence per Section 17. | Status: done
- [x] **Test markdown routing end-to-end** -- Route a `.md` file, verify passthrough with cleanup per Section 17. | Status: done
- [x] **Test HTML routing end-to-end** -- Route an HTML file, verify markdown output per Section 17. | Status: done
- [ ] **Test determinism** -- Route same file twice with same options, verify identical content per Section 17. | Status: not_done

### 15.2 docling Integration Tests (`docling-integration.test.ts`)

- [ ] **Test docling parser selection when installed** -- Verify `parserUsed === 'docling-node-ts'` for PDF/DOCX/PPTX/HTML per Section 17. | Status: not_done
- [ ] **Test fallback when docling not installed** -- Verify fallback parser is used and `FALLBACK_PARSER` warning is emitted per Section 17. | Status: not_done

### 15.3 Custom Parser Tests

- [x] **Test custom parser registration and invocation** -- Register a custom parser, route a file, verify custom output is returned per Section 17. | Status: done
- [x] **Test custom parser overrides docling** -- Register custom PDF parser, verify it takes priority over docling per Section 17. | Status: done

### 15.4 Batch Integration Tests (`batch.test.ts`)

- [x] **Test batch routing of mixed formats** -- Route 10 mixed-format files, verify all results returned in order per Section 17. | Status: done
- [x] **Test batch with failures** -- Include a bad file, verify other files succeed and failed file has `RouteError` per Section 17. | Status: done

### 15.5 Directory Integration Tests (`directory.test.ts`)

- [x] **Test directory routing** -- Create a temp directory with mixed files, run `routeDirectory`, verify all files processed per Section 17. | Status: done
- [x] **Test directory exclusion patterns** -- Verify excluded files are skipped per Section 17. | Status: done

### 15.6 Format Detection Integration Tests

- [x] **Test mismatched extension and content** -- Feed a PDF file with a `.txt` extension, verify magic bytes win per Section 17. | Status: done

---

## Phase 16: Edge Case Tests

- [ ] **Test empty file (zero bytes)** -- Verify `NO_TEXT_EXTRACTED` warning and empty content per Section 17. | Status: not_done
- [ ] **Test file with no extension and no magic bytes** -- Verify content heuristic or `FormatDetectionError` per Section 17. | Status: not_done
- [ ] **Test binary file that is not recognized** -- Verify appropriate error per Section 17. | Status: not_done
- [ ] **Test file with incorrect extension** -- JSON file named `data.pdf`, verify correct routing per Section 17. | Status: not_done
- [ ] **Test very large file (100MB+)** -- Verify `LARGE_FILE` warning and reasonable processing per Section 17. | Status: not_done
- [ ] **Test non-UTF-8 encoding** -- Test ISO-8859-1 and Shift-JIS files, verify `ENCODING_ISSUE` warning per Section 17. | Status: not_done
- [ ] **Test CSV with malformed rows** -- Inconsistent column counts per Section 17. | Status: not_done
- [ ] **Test XLSX with multiple sheets, some empty** -- Verify handling per Section 17. | Status: not_done
- [ ] **Test code file with no extension but shebang** -- Verify language detection from shebang per Section 17. | Status: not_done
- [ ] **Test image with corrupted header** -- Verify placeholder without dimensions per Section 17. | Status: not_done
- [x] **Test Buffer input with no fileName or mimeType** -- Verify fallback detection per Section 17. | Status: done
- [ ] **Test URL that returns 404** -- Verify `InputError` per Section 17. | Status: not_done
- [ ] **Test AbortSignal triggered mid-processing** -- Verify cancellation per Section 17. | Status: not_done
- [ ] **Test concurrent route() calls on same router** -- Verify thread safety per Section 17. | Status: not_done
- [x] **Test routeDirectory on empty directory** -- Verify graceful handling per Section 17. | Status: done
- [ ] **Test routeDirectory on directory with only excluded files** -- Verify empty result per Section 17. | Status: not_done

---

## Phase 17: Test Fixtures

- [ ] **Create PDF test fixture** -- A simple multi-page PDF with headings, text, and a table for integration tests. | Status: not_done
- [ ] **Create DOCX test fixture** -- A DOCX with headings, lists, and formatting for integration tests. | Status: not_done
- [ ] **Create XLSX test fixture** -- An XLSX with multiple sheets for integration tests. | Status: not_done
- [ ] **Create CSV test fixtures** -- Simple CSV, CSV with quoted fields, CSV with malformed rows. | Status: not_done
- [ ] **Create HTML test fixture** -- An HTML page with headings, paragraphs, lists, and navigation. | Status: not_done
- [ ] **Create JSON test fixtures** -- Small JSON and large JSON (>10KB) for summarization testing. | Status: not_done
- [ ] **Create code test fixtures** -- TypeScript, Python, and Bash files with comments for code parser testing. | Status: not_done
- [ ] **Create image test fixtures** -- Small PNG, JPEG, and GIF files for placeholder and dimension testing. | Status: not_done
- [ ] **Create SVG test fixture** -- An SVG with text elements and one without text elements. | Status: not_done
- [ ] **Create mixed directory fixture** -- Directory with files of various formats for `routeDirectory` testing. | Status: not_done
- [ ] **Create plain text test fixtures** -- Text file with CRLF line endings, trailing whitespace. | Status: not_done
- [ ] **Create markdown test fixture** -- Markdown file for passthrough testing. | Status: not_done
- [ ] **Create YAML test fixture** -- A multi-document YAML file. | Status: not_done
- [ ] **Create RST test fixture** -- A reStructuredText file with headings and directives. | Status: not_done

---

## Phase 18: Documentation

- [ ] **Write README.md** -- Usage examples, installation instructions, format support table, API reference, CLI reference, integration guides with docling-node-ts/chunk-smart/embed-cache per Section 22 Phase 5. | Status: not_done
- [ ] **Add JSDoc comments to all public exports** -- Document `route`, `routeBatch`, `routeDirectory`, `detectFormat`, `createRouter`, and all public interfaces per CLAUDE.md workflow step 3. | Status: not_done
- [ ] **Document format support table in README** -- Table of all 30+ supported formats with parser and output format per Section 6. | Status: not_done
- [ ] **Document CLI usage in README** -- All flags, examples, exit codes, and environment variables per Section 15. | Status: not_done
- [ ] **Document integration patterns in README** -- docling-node-ts, chunk-smart, embed-cache, rag-prompt-builder integration examples per Section 16. | Status: not_done
- [ ] **Document custom parser registration in README** -- How to register custom parsers with example per Section 7.4. | Status: not_done

---

## Phase 19: Build, Lint, and CI

- [x] **Verify TypeScript compilation passes** -- Run `npm run build` and ensure no type errors. | Status: done
- [x] **Configure ESLint** -- Set up ESLint with appropriate TypeScript rules. Ensure `npm run lint` passes. | Status: done
- [x] **Verify all tests pass** -- Run `npm run test` (vitest) and ensure all tests pass. | Status: done
- [ ] **Verify package builds for publishing** -- Run `npm run prepublishOnly` and verify `dist/` output includes all expected files. | Status: not_done
- [ ] **Verify CLI is executable** -- Test that `npx ai-file-router --help` works after build. | Status: not_done

---

## Phase 20: Version Bump and Publishing

- [ ] **Bump version in package.json** -- Follow semver per CLAUDE.md workflow: patch for fixes, minor for features, major for breaking changes. | Status: not_done
- [ ] **Create feature branch** -- `feat/ai-file-router/<description>` per CLAUDE.md workflow. | Status: not_done
- [ ] **Create PR** -- Following the CLAUDE.md PR template with checklist. | Status: not_done
- [ ] **Wait for CI to pass** -- Ensure all checks are green per CLAUDE.md workflow. | Status: not_done
- [ ] **Merge PR and publish** -- `gh pr merge --squash --delete-branch`, then `npm publish` from master per CLAUDE.md workflow. | Status: not_done
