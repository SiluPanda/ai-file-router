import { FormatInfo } from "./types.js";
/**
 * Extension to format mapping.
 */
declare const EXTENSION_MAP: Record<string, {
    format: string;
    language?: string;
    subtype?: string;
    mimeType?: string;
}>;
/**
 * MIME type to format mapping.
 */
declare const MIME_MAP: Record<string, {
    format: string;
    subtype?: string;
    language?: string;
}>;
/**
 * Detect the format of a file from its content and/or path.
 *
 * @param options.content - File content as Buffer or string
 * @param options.filePath - File path for extension-based detection
 * @param options.mimeType - MIME type hint
 * @param options.format - Explicit format override
 * @param options.fileName - File name hint (used when filePath is not available)
 */
export declare function detectFormat(options: {
    content?: Buffer | string;
    filePath?: string;
    mimeType?: string;
    format?: string;
    fileName?: string;
}): FormatInfo;
export { EXTENSION_MAP, MIME_MAP };
//# sourceMappingURL=detect.d.ts.map