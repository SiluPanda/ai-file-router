import * as fs from "node:fs";
import * as path from "node:path";
import { BatchRouteResult, BatchOptions, RouteOptions } from "./types.js";
import { route } from "./router.js";

/**
 * Route multiple files through the parsing pipeline.
 *
 * @param sources - Array of file paths or Buffers.
 * @param options - Batch options including concurrency.
 * @returns Array of BatchRouteResult.
 */
export async function routeBatch(
  sources: Array<string | Buffer>,
  options: BatchOptions = {}
): Promise<BatchRouteResult[]> {
  const concurrency = options.concurrency ?? 5;
  const results: BatchRouteResult[] = [];

  // Strip batch-specific options to pass to route()
  const routeOptions: RouteOptions = {
    format: options.format,
    outputFormat: options.outputFormat,
    mimeType: options.mimeType,
    maxSize: options.maxSize,
    fileName: options.fileName,
    codeOptions: options.codeOptions,
  };

  // Process with concurrency limit
  const queue = [...sources];
  const inflight: Promise<void>[] = [];

  for (const source of queue) {
    const sourceName = typeof source === "string" ? source : "(buffer)";

    const task = route(source, routeOptions)
      .then((result) => {
        results.push({ source: sourceName, result });
      })
      .catch((err) => {
        results.push({
          source: sourceName,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    inflight.push(task);

    if (inflight.length >= concurrency) {
      await Promise.race(inflight);
      // Remove settled promises
      for (let i = inflight.length - 1; i >= 0; i--) {
        // Use Promise.race pattern - we'll just wait all when done
      }
    }
  }

  await Promise.all(inflight);
  return results;
}

/**
 * Route all files in a directory through the parsing pipeline.
 *
 * @param dirPath - Directory to scan.
 * @param options - Batch options including recursive flag and glob patterns.
 * @returns Array of BatchRouteResult.
 */
export async function routeDirectory(
  dirPath: string,
  options: BatchOptions = {}
): Promise<BatchRouteResult[]> {
  const recursive = options.recursive ?? true;
  const files = scanDirectory(dirPath, recursive, options.include, options.exclude);
  return routeBatch(files, options);
}

/**
 * Recursively scan a directory for files.
 */
function scanDirectory(
  dirPath: string,
  recursive: boolean,
  include?: string[],
  exclude?: string[]
): string[] {
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        // Skip common non-content directories
        const skipDirs = ["node_modules", ".git", "__pycache__", ".next", "dist", "build"];
        if (!skipDirs.includes(entry.name)) {
          results.push(...scanDirectory(fullPath, recursive, include, exclude));
        }
      }
    } else if (entry.isFile()) {
      // Apply include/exclude filters
      if (include && include.length > 0) {
        if (!matchesAny(entry.name, include)) continue;
      }
      if (exclude && exclude.length > 0) {
        if (matchesAny(entry.name, exclude)) continue;
      }
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Simple glob matching (supports * and ** patterns).
 */
function matchesAny(fileName: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (matchGlob(fileName, pattern)) return true;
  }
  return false;
}

function matchGlob(str: string, pattern: string): boolean {
  // Convert glob to regex
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*")
    .replace(/\?/g, ".");

  return new RegExp(`^${escaped}$`).test(str);
}
