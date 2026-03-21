import * as path from "node:path";
import { FormatInfo, DetectionMethod } from "./types.js";

/**
 * Magic byte signatures for format detection.
 */
const MAGIC_SIGNATURES: Array<{
  format: string;
  bytes: number[];
  offset: number;
  mimeType: string;
  extra?: { bytes: number[]; offset: number; value: string };
}> = [
  { format: "pdf", bytes: [0x25, 0x50, 0x44, 0x46], offset: 0, mimeType: "application/pdf" },
  { format: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0, mimeType: "image/png" },
  { format: "jpeg", bytes: [0xff, 0xd8, 0xff], offset: 0, mimeType: "image/jpeg" },
  { format: "gif", bytes: [0x47, 0x49, 0x46, 0x38], offset: 0, mimeType: "image/gif" },
  { format: "bmp", bytes: [0x42, 0x4d], offset: 0, mimeType: "image/bmp" },
  { format: "tiff", bytes: [0x49, 0x49, 0x2a, 0x00], offset: 0, mimeType: "image/tiff" },
  { format: "tiff", bytes: [0x4d, 0x4d, 0x00, 0x2a], offset: 0, mimeType: "image/tiff" },
  { format: "rtf", bytes: [0x7b, 0x5c, 0x72, 0x74, 0x66], offset: 0, mimeType: "application/rtf" },
  { format: "gzip", bytes: [0x1f, 0x8b], offset: 0, mimeType: "application/gzip" },
  // ZIP must be last among binary checks since DOCX/PPTX/XLSX are also ZIP
  { format: "zip", bytes: [0x50, 0x4b, 0x03, 0x04], offset: 0, mimeType: "application/zip" },
];

// WEBP check needs special handling (RIFF at 0 + WEBP at 8)
function isWebP(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  return (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  );
}

/**
 * Extension to format mapping.
 */
const EXTENSION_MAP: Record<string, { format: string; language?: string; subtype?: string; mimeType?: string }> = {
  ".pdf": { format: "pdf", mimeType: "application/pdf" },
  ".docx": { format: "docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  ".doc": { format: "doc", mimeType: "application/msword" },
  ".pptx": { format: "pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  ".ppt": { format: "ppt", mimeType: "application/vnd.ms-powerpoint" },
  ".xlsx": { format: "xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  ".xls": { format: "xls", mimeType: "application/vnd.ms-excel" },
  ".csv": { format: "csv", mimeType: "text/csv" },
  ".tsv": { format: "tsv", mimeType: "text/tab-separated-values" },
  ".html": { format: "html", mimeType: "text/html" },
  ".htm": { format: "html", mimeType: "text/html" },
  ".xml": { format: "xml", mimeType: "text/xml" },
  ".md": { format: "markdown", mimeType: "text/markdown" },
  ".markdown": { format: "markdown", mimeType: "text/markdown" },
  ".rst": { format: "rst", mimeType: "text/x-rst" },
  ".json": { format: "json", mimeType: "application/json" },
  ".yaml": { format: "yaml", mimeType: "text/yaml" },
  ".yml": { format: "yaml", mimeType: "text/yaml" },
  ".toml": { format: "toml", mimeType: "application/toml" },
  ".txt": { format: "text", mimeType: "text/plain" },
  ".log": { format: "text", mimeType: "text/plain" },
  ".rtf": { format: "rtf", mimeType: "application/rtf" },
  ".odt": { format: "odt", mimeType: "application/vnd.oasis.opendocument.text" },
  // Code files
  ".js": { format: "code", language: "javascript", mimeType: "text/javascript" },
  ".mjs": { format: "code", language: "javascript", mimeType: "text/javascript" },
  ".cjs": { format: "code", language: "javascript", mimeType: "text/javascript" },
  ".ts": { format: "code", language: "typescript", mimeType: "text/typescript" },
  ".mts": { format: "code", language: "typescript", mimeType: "text/typescript" },
  ".cts": { format: "code", language: "typescript", mimeType: "text/typescript" },
  ".jsx": { format: "code", language: "typescript", mimeType: "text/javascript" },
  ".tsx": { format: "code", language: "typescript", mimeType: "text/typescript" },
  ".py": { format: "code", language: "python", mimeType: "text/x-python" },
  ".pyw": { format: "code", language: "python", mimeType: "text/x-python" },
  ".rs": { format: "code", language: "rust", mimeType: "text/x-rust" },
  ".go": { format: "code", language: "go", mimeType: "text/x-go" },
  ".java": { format: "code", language: "java", mimeType: "text/x-java" },
  ".c": { format: "code", language: "c", mimeType: "text/x-c" },
  ".h": { format: "code", language: "c", mimeType: "text/x-c" },
  ".cpp": { format: "code", language: "cpp", mimeType: "text/x-c++src" },
  ".cc": { format: "code", language: "cpp", mimeType: "text/x-c++src" },
  ".cxx": { format: "code", language: "cpp", mimeType: "text/x-c++src" },
  ".hpp": { format: "code", language: "cpp", mimeType: "text/x-c++hdr" },
  ".hxx": { format: "code", language: "cpp", mimeType: "text/x-c++hdr" },
  ".cs": { format: "code", language: "csharp", mimeType: "text/x-csharp" },
  ".rb": { format: "code", language: "ruby", mimeType: "text/x-ruby" },
  ".php": { format: "code", language: "php", mimeType: "text/x-php" },
  ".swift": { format: "code", language: "swift", mimeType: "text/x-swift" },
  ".kt": { format: "code", language: "kotlin", mimeType: "text/x-kotlin" },
  ".kts": { format: "code", language: "kotlin", mimeType: "text/x-kotlin" },
  ".scala": { format: "code", language: "scala", mimeType: "text/x-scala" },
  ".sh": { format: "code", language: "bash", mimeType: "text/x-shellscript" },
  ".bash": { format: "code", language: "bash", mimeType: "text/x-shellscript" },
  ".zsh": { format: "code", language: "bash", mimeType: "text/x-shellscript" },
  ".sql": { format: "code", language: "sql", mimeType: "text/x-sql" },
  ".r": { format: "code", language: "r", mimeType: "text/x-r" },
  ".R": { format: "code", language: "r", mimeType: "text/x-r" },
  ".lua": { format: "code", language: "lua", mimeType: "text/x-lua" },
  ".pl": { format: "code", language: "perl", mimeType: "text/x-perl" },
  ".pm": { format: "code", language: "perl", mimeType: "text/x-perl" },
  ".ex": { format: "code", language: "elixir", mimeType: "text/x-elixir" },
  ".exs": { format: "code", language: "elixir", mimeType: "text/x-elixir" },
  ".erl": { format: "code", language: "erlang", mimeType: "text/x-erlang" },
  ".hs": { format: "code", language: "haskell", mimeType: "text/x-haskell" },
  ".dart": { format: "code", language: "dart", mimeType: "text/x-dart" },
  ".vue": { format: "code", language: "vue", mimeType: "text/x-vue" },
  ".svelte": { format: "code", language: "svelte", mimeType: "text/x-svelte" },
  ".css": { format: "code", language: "css", mimeType: "text/css" },
  ".scss": { format: "code", language: "scss", mimeType: "text/x-scss" },
  ".sass": { format: "code", language: "scss", mimeType: "text/x-scss" },
  ".less": { format: "code", language: "less", mimeType: "text/x-less" },
  ".graphql": { format: "code", language: "graphql", mimeType: "application/graphql" },
  ".gql": { format: "code", language: "graphql", mimeType: "application/graphql" },
  ".proto": { format: "code", language: "protobuf", mimeType: "text/x-protobuf" },
  ".tf": { format: "code", language: "hcl", mimeType: "text/x-hcl" },
  // Image files
  ".png": { format: "image", subtype: "png", mimeType: "image/png" },
  ".jpg": { format: "image", subtype: "jpeg", mimeType: "image/jpeg" },
  ".jpeg": { format: "image", subtype: "jpeg", mimeType: "image/jpeg" },
  ".gif": { format: "image", subtype: "gif", mimeType: "image/gif" },
  ".webp": { format: "image", subtype: "webp", mimeType: "image/webp" },
  ".tiff": { format: "image", subtype: "tiff", mimeType: "image/tiff" },
  ".tif": { format: "image", subtype: "tiff", mimeType: "image/tiff" },
  ".bmp": { format: "image", subtype: "bmp", mimeType: "image/bmp" },
  ".svg": { format: "image", subtype: "svg", mimeType: "image/svg+xml" },
};

/**
 * MIME type to format mapping.
 */
const MIME_MAP: Record<string, { format: string; subtype?: string; language?: string }> = {
  "application/pdf": { format: "pdf" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { format: "docx" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { format: "pptx" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { format: "xlsx" },
  "text/html": { format: "html" },
  "text/xml": { format: "xml" },
  "application/xml": { format: "xml" },
  "text/markdown": { format: "markdown" },
  "text/csv": { format: "csv" },
  "text/tab-separated-values": { format: "tsv" },
  "application/json": { format: "json" },
  "text/yaml": { format: "yaml" },
  "application/x-yaml": { format: "yaml" },
  "text/plain": { format: "text" },
  "application/rtf": { format: "rtf" },
  "image/png": { format: "image", subtype: "png" },
  "image/jpeg": { format: "image", subtype: "jpeg" },
  "image/gif": { format: "image", subtype: "gif" },
  "image/webp": { format: "image", subtype: "webp" },
  "image/tiff": { format: "image", subtype: "tiff" },
  "image/bmp": { format: "image", subtype: "bmp" },
  "image/svg+xml": { format: "image", subtype: "svg" },
};

/**
 * Map magic-byte detected format to image subtypes.
 */
const MAGIC_IMAGE_SUBTYPES: Record<string, string> = {
  png: "png",
  jpeg: "jpeg",
  gif: "gif",
  webp: "webp",
  tiff: "tiff",
  bmp: "bmp",
};

/**
 * Try to detect format from magic bytes.
 */
function detectFromMagicBytes(buf: Buffer): FormatInfo | null {
  if (buf.length < 2) return null;

  // Check WEBP first (it's a special case with RIFF container)
  if (isWebP(buf)) {
    return {
      format: "image",
      confidence: 1.0,
      method: "magic-bytes",
      mimeType: "image/webp",
      subtype: "webp",
    };
  }

  for (const sig of MAGIC_SIGNATURES) {
    if (buf.length < sig.offset + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buf[sig.offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (!match) continue;

    const imageSubtype = MAGIC_IMAGE_SUBTYPES[sig.format];
    if (imageSubtype) {
      return {
        format: "image",
        confidence: 1.0,
        method: "magic-bytes",
        mimeType: sig.mimeType,
        subtype: imageSubtype,
      };
    }

    if (sig.format === "zip") {
      // ZIP-based: disambiguate via extension (no zip reading without deps)
      return {
        format: "zip",
        confidence: 0.9,
        method: "magic-bytes",
        mimeType: sig.mimeType,
      };
    }

    return {
      format: sig.format,
      confidence: 1.0,
      method: "magic-bytes",
      mimeType: sig.mimeType,
    };
  }

  return null;
}

/**
 * Try to detect format from MIME type.
 */
function detectFromMimeType(mimeType: string): FormatInfo | null {
  // Ignore uninformative MIME types
  if (mimeType === "application/octet-stream") return null;

  const mapped = MIME_MAP[mimeType];
  if (mapped) {
    return {
      format: mapped.format,
      confidence: 0.8,
      method: "mime-type",
      mimeType,
      subtype: mapped.subtype,
      language: mapped.language,
    };
  }
  return null;
}

/**
 * Try to detect format from file extension.
 */
function detectFromExtension(filePath: string): FormatInfo | null {
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) {
    // Check for special filenames
    const base = path.basename(filePath);
    if (base === "Dockerfile" || base.toLowerCase() === "dockerfile") {
      return {
        format: "code",
        confidence: 0.6,
        method: "extension",
        language: "dockerfile",
      };
    }
    if (base === "Makefile" || base.toLowerCase() === "makefile") {
      return {
        format: "code",
        confidence: 0.6,
        method: "extension",
        language: "makefile",
      };
    }
    return null;
  }

  const mapped = EXTENSION_MAP[ext];
  if (mapped) {
    return {
      format: mapped.format,
      confidence: 0.6,
      method: "extension",
      extension: ext,
      mimeType: mapped.mimeType,
      language: mapped.language,
      subtype: mapped.subtype,
    };
  }
  return null;
}

/**
 * Content heuristic: try to guess format from content for text-like inputs.
 */
function detectFromContent(content: string): FormatInfo | null {
  const trimmed = content.trimStart();

  // JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(content);
      return { format: "json", confidence: 0.5, method: "content-heuristic" };
    } catch {
      // not valid JSON
    }
  }

  // HTML
  if (/^<(!doctype|html|head|body|div|p|span|table)\b/i.test(trimmed)) {
    return { format: "html", confidence: 0.5, method: "content-heuristic" };
  }

  // XML
  if (trimmed.startsWith("<?xml")) {
    return { format: "xml", confidence: 0.5, method: "content-heuristic" };
  }

  // YAML (starts with --- or has key: value pattern)
  if (trimmed.startsWith("---") || /^\w[\w\s]*:\s/m.test(trimmed)) {
    return { format: "yaml", confidence: 0.5, method: "content-heuristic" };
  }

  // Markdown (has # headers or common markdown patterns)
  if (/^#{1,6}\s/m.test(trimmed)) {
    return { format: "markdown", confidence: 0.5, method: "content-heuristic" };
  }

  return null;
}

/**
 * Disambiguate a ZIP-based format using file extension.
 */
function disambiguateZip(extInfo: FormatInfo | null): FormatInfo {
  if (extInfo) {
    const zipFormats = ["docx", "pptx", "xlsx", "odt"];
    if (zipFormats.includes(extInfo.format)) {
      return {
        ...extInfo,
        confidence: 0.9,
        method: "magic-bytes",
      };
    }
  }
  // Unknown ZIP
  return {
    format: "zip",
    confidence: 0.9,
    method: "magic-bytes",
    mimeType: "application/zip",
  };
}

/**
 * Detect the format of a file from its content and/or path.
 *
 * @param options.content - File content as Buffer or string
 * @param options.filePath - File path for extension-based detection
 * @param options.mimeType - MIME type hint
 * @param options.format - Explicit format override
 * @param options.fileName - File name hint (used when filePath is not available)
 */
export function detectFormat(options: {
  content?: Buffer | string;
  filePath?: string;
  mimeType?: string;
  format?: string;
  fileName?: string;
}): FormatInfo {
  const { content, filePath, mimeType, format, fileName } = options;

  // 1. Explicit format override
  if (format) {
    return {
      format,
      confidence: 1.0,
      method: "explicit",
    };
  }

  const buf = content
    ? Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, "utf-8")
    : null;

  // Resolve path for extension detection
  const pathForExt = filePath || fileName;

  // 2. Magic bytes
  let magicResult: FormatInfo | null = null;
  if (buf && buf.length >= 2) {
    magicResult = detectFromMagicBytes(buf);
  }

  // 3. MIME type
  let mimeResult: FormatInfo | null = null;
  if (mimeType) {
    mimeResult = detectFromMimeType(mimeType);
  }

  // 4. Extension
  let extResult: FormatInfo | null = null;
  if (pathForExt) {
    extResult = detectFromExtension(pathForExt);
  }

  // Handle ZIP disambiguation
  if (magicResult && magicResult.format === "zip") {
    magicResult = disambiguateZip(extResult);
  }

  // Return highest-confidence result
  if (magicResult) return magicResult;
  if (mimeResult) return mimeResult;
  if (extResult) return extResult;

  // 5. Content heuristic for text-like content
  if (buf) {
    // Check if content looks like text (no null bytes in first 512 bytes)
    const sample = buf.subarray(0, Math.min(512, buf.length));
    const isText = !sample.includes(0x00);
    if (isText) {
      const textContent = buf.toString("utf-8");
      const heuristicResult = detectFromContent(textContent);
      if (heuristicResult) return heuristicResult;
      // Default to plain text for text-like content
      return {
        format: "text",
        confidence: 0.3,
        method: "content-heuristic",
        mimeType: "text/plain",
      };
    }
  }

  // Unknown format
  return {
    format: "unknown",
    confidence: 0,
    method: "content-heuristic",
  };
}

export { EXTENSION_MAP, MIME_MAP };
