"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeBatch = routeBatch;
exports.routeDirectory = routeDirectory;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const router_js_1 = require("./router.js");
/**
 * Route multiple files through the parsing pipeline.
 *
 * @param sources - Array of file paths or Buffers.
 * @param options - Batch options including concurrency.
 * @returns Array of BatchRouteResult.
 */
async function routeBatch(sources, options = {}) {
    const concurrency = options.concurrency ?? 5;
    const results = [];
    // Strip batch-specific options to pass to route()
    const routeOptions = {
        format: options.format,
        outputFormat: options.outputFormat,
        mimeType: options.mimeType,
        maxSize: options.maxSize,
        fileName: options.fileName,
        codeOptions: options.codeOptions,
    };
    // Process with concurrency limit
    const queue = [...sources];
    const inflight = [];
    for (const source of queue) {
        const sourceName = typeof source === "string" ? source : "(buffer)";
        const task = (0, router_js_1.route)(source, routeOptions)
            .then((result) => {
            results.push({ source: sourceName, result });
        })
            .catch((err) => {
            results.push({
                source: sourceName,
                error: err instanceof Error ? err.message : String(err),
            });
        })
            .finally(() => {
            const idx = inflight.indexOf(task);
            if (idx !== -1)
                inflight.splice(idx, 1);
        });
        inflight.push(task);
        if (inflight.length >= concurrency) {
            await Promise.race(inflight);
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
async function routeDirectory(dirPath, options = {}) {
    const recursive = options.recursive ?? true;
    const files = scanDirectory(dirPath, recursive, options.include, options.exclude);
    return routeBatch(files, options);
}
/**
 * Recursively scan a directory for files.
 */
function scanDirectory(dirPath, recursive, include, exclude) {
    const results = [];
    let entries;
    try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
    }
    catch {
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
        }
        else if (entry.isFile()) {
            // Apply include/exclude filters
            if (include && include.length > 0) {
                if (!matchesAny(entry.name, include))
                    continue;
            }
            if (exclude && exclude.length > 0) {
                if (matchesAny(entry.name, exclude))
                    continue;
            }
            results.push(fullPath);
        }
    }
    return results;
}
/**
 * Simple glob matching (supports * and ** patterns).
 */
function matchesAny(fileName, patterns) {
    for (const pattern of patterns) {
        if (matchGlob(fileName, pattern))
            return true;
    }
    return false;
}
function matchGlob(str, pattern) {
    // Convert glob to regex
    const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "{{GLOBSTAR}}")
        .replace(/\*/g, "[^/]*")
        .replace(/{{GLOBSTAR}}/g, ".*")
        .replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`).test(str);
}
//# sourceMappingURL=batch.js.map