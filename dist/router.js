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
exports.route = route;
exports.registerParser = registerParser;
exports.getRegistry = getRegistry;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const detect_js_1 = require("./detect.js");
const registry_js_1 = require("./registry.js");
/**
 * The default global registry instance.
 */
const globalRegistry = new registry_js_1.ParserRegistry();
/**
 * Route a file through the optimal parsing pipeline.
 *
 * @param source - File path, Buffer, or string content.
 * @param options - Route options (format override, output format, MIME type, etc.).
 * @returns RouteResult with extracted content and metadata.
 */
async function route(source, options = {}) {
    const startTime = Date.now();
    const warnings = [];
    let content;
    let filePath;
    let fileName;
    let fileSize;
    // Determine input type
    if (Buffer.isBuffer(source)) {
        content = source;
        fileName = options.fileName;
        fileSize = source.length;
    }
    else if (typeof source === "string") {
        // Check if it's a file path
        if (isFilePath(source)) {
            try {
                content = fs.readFileSync(source);
                filePath = source;
                fileName = path.basename(source);
                fileSize = content.length;
            }
            catch (err) {
                return makeErrorResult(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`, source, startTime);
            }
        }
        else {
            // Treat as inline content
            content = source;
            fileName = options.fileName;
            fileSize = Buffer.byteLength(source, "utf-8");
        }
    }
    else {
        return makeErrorResult("Invalid source: expected string or Buffer", undefined, startTime);
    }
    // Detect format
    const formatInfo = (0, detect_js_1.detectFormat)({
        content,
        filePath,
        mimeType: options.mimeType,
        format: options.format,
        fileName,
    });
    if (formatInfo.format === "unknown") {
        return makeErrorResult("Unable to detect file format. Provide a format hint via options.format or options.mimeType.", filePath, startTime);
    }
    // Find parser
    const parserInput = {
        content,
        formatInfo,
        filePath,
        fileName,
    };
    const parser = globalRegistry.findParser(parserInput);
    if (!parser) {
        return makeErrorResult(`No parser registered for format: ${formatInfo.format}`, filePath, startTime);
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
        const metadata = {
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
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        warnings.push(`Parser error: ${errorMsg}`);
        return makeErrorResult(`Parser '${parser.name}' failed: ${errorMsg}`, filePath, startTime, formatInfo.format, warnings);
    }
}
/**
 * Register a custom parser in the global registry.
 */
function registerParser(parser) {
    globalRegistry.register(parser);
}
/**
 * Get the global parser registry.
 */
function getRegistry() {
    return globalRegistry;
}
/**
 * Check if a string looks like a file path (exists on disk or has path-like structure).
 */
function isFilePath(s) {
    // Strings with newlines are likely content, not paths
    if (s.includes("\n"))
        return false;
    // Check if file exists
    try {
        fs.accessSync(s, fs.constants.R_OK);
        return true;
    }
    catch {
        // Check if it looks like a file path even if non-existent
        // Paths start with /, ./, ../, ~, or drive letter on Windows
        if (s.startsWith("/") ||
            s.startsWith("./") ||
            s.startsWith("../") ||
            s.startsWith("~") ||
            /^[a-zA-Z]:[\\/]/.test(s)) {
            return true;
        }
        // Has directory separators and an extension
        if ((s.includes("/") || s.includes("\\")) && /\.\w+$/.test(s)) {
            return true;
        }
        return false;
    }
}
function countWords(text) {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
}
function makeErrorResult(message, filePath, startTime, sourceFormat = "unknown", warnings = []) {
    return {
        content: "",
        format: "text",
        sourceFormat,
        metadata: { filePath },
        warnings: [...warnings, message],
        durationMs: Date.now() - startTime,
    };
}
//# sourceMappingURL=router.js.map