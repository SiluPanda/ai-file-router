import * as fs from "node:fs";
import * as path from "node:path";
import {
  RouteResult,
  RouteOptions,
  Parser,
  ParserInput,
  FileMetadata,
} from "./types.js";
import { detectFormat } from "./detect.js";
import { ParserRegistry } from "./registry.js";

/**
 * The default global registry instance.
 */
const globalRegistry = new ParserRegistry();

/**
 * Route a file through the optimal parsing pipeline.
 *
 * @param source - File path, Buffer, or string content.
 * @param options - Route options (format override, output format, MIME type, etc.).
 * @returns RouteResult with extracted content and metadata.
 */
export async function route(
  source: string | Buffer,
  options: RouteOptions = {}
): Promise<RouteResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  let content: Buffer | string;
  let filePath: string | undefined;
  let fileName: string | undefined;
  let fileSize: number | undefined;

  // Determine input type
  if (Buffer.isBuffer(source)) {
    content = source;
    fileName = options.fileName;
    fileSize = source.length;
  } else if (typeof source === "string") {
    // Check if it's a file path
    if (isFilePath(source)) {
      try {
        content = fs.readFileSync(source);
        filePath = source;
        fileName = path.basename(source);
        fileSize = content.length;
      } catch (err) {
        return makeErrorResult(
          `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
          source,
          startTime
        );
      }
    } else {
      // Treat as inline content
      content = source;
      fileName = options.fileName;
      fileSize = Buffer.byteLength(source, "utf-8");
    }
  } else {
    return makeErrorResult("Invalid source: expected string or Buffer", undefined, startTime);
  }

  // Detect format
  const formatInfo = detectFormat({
    content,
    filePath,
    mimeType: options.mimeType,
    format: options.format,
    fileName,
  });

  if (formatInfo.format === "unknown") {
    return makeErrorResult(
      "Unable to detect file format. Provide a format hint via options.format or options.mimeType.",
      filePath,
      startTime
    );
  }

  // Find parser
  const parserInput: ParserInput = {
    content,
    formatInfo,
    filePath,
    fileName,
  };

  const parser = globalRegistry.findParser(parserInput);
  if (!parser) {
    return makeErrorResult(
      `No parser registered for format: ${formatInfo.format}`,
      filePath,
      startTime
    );
  }

  // Parse
  try {
    const result = await parser.parse(parserInput, options);
    if (result.warnings) {
      warnings.push(...result.warnings);
    }

    let finalContent = result.content;

    // Apply maxSize truncation if needed
    if (options.maxSize && options.maxSize > 0 && finalContent.length > options.maxSize) {
      finalContent = finalContent.substring(0, options.maxSize);
      warnings.push(`Output truncated to ${options.maxSize} characters`);
    }

    // Build metadata
    const wordCount = countWords(finalContent);
    const metadata: FileMetadata = {
      filePath,
      fileSize,
      wordCount,
      fileName,
    };

    return {
      content: finalContent,
      format: result.format,
      sourceFormat: formatInfo.format,
      mimeType: formatInfo.mimeType,
      metadata,
      warnings,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    warnings.push(`Parser error: ${errorMsg}`);
    return makeErrorResult(
      `Parser '${parser.name}' failed: ${errorMsg}`,
      filePath,
      startTime,
      formatInfo.format,
      warnings
    );
  }
}

/**
 * Register a custom parser in the global registry.
 */
export function registerParser(parser: Parser): void {
  globalRegistry.register(parser);
}

/**
 * Get the global parser registry.
 */
export function getRegistry(): ParserRegistry {
  return globalRegistry;
}

/**
 * Check if a string looks like a file path (exists on disk or has path-like structure).
 */
function isFilePath(s: string): boolean {
  // Strings with newlines are likely content, not paths
  if (s.includes("\n")) return false;
  // Check if file exists
  try {
    fs.accessSync(s, fs.constants.R_OK);
    return true;
  } catch {
    // Check if it looks like a file path even if non-existent
    // Paths start with /, ./, ../, ~, or drive letter on Windows
    if (
      s.startsWith("/") ||
      s.startsWith("./") ||
      s.startsWith("../") ||
      s.startsWith("~") ||
      /^[a-zA-Z]:[\\/]/.test(s)
    ) {
      return true;
    }
    // Has directory separators and an extension
    if ((s.includes("/") || s.includes("\\")) && /\.\w+$/.test(s)) {
      return true;
    }
    return false;
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function makeErrorResult(
  message: string,
  filePath: string | undefined,
  startTime: number,
  sourceFormat: string = "unknown",
  warnings: string[] = []
): RouteResult {
  return {
    content: "",
    format: "text",
    sourceFormat,
    metadata: { filePath },
    warnings: [...warnings, message],
    durationMs: Date.now() - startTime,
  };
}
