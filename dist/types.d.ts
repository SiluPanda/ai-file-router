/**
 * Output format indicator.
 */
export type OutputFormat = "markdown" | "text";
/**
 * Detection method used to identify format.
 */
export type DetectionMethod = "explicit" | "magic-bytes" | "mime-type" | "extension" | "content-heuristic";
/**
 * Information about a detected file format.
 */
export interface FormatInfo {
    /** Detected format identifier (e.g. 'pdf', 'docx', 'code', 'text', 'image'). */
    format: string;
    /** Confidence score 0-1. */
    confidence: number;
    /** Method used for detection. */
    method: DetectionMethod;
    /** MIME type if known. */
    mimeType?: string;
    /** File extension if known (with leading dot). */
    extension?: string;
    /** Language for code files, subtype for images. */
    language?: string;
    /** Subtype for images (png, jpeg, etc). */
    subtype?: string;
}
/**
 * Metadata about the processed file.
 */
export interface FileMetadata {
    /** Original file path if available. */
    filePath?: string;
    /** File size in bytes. */
    fileSize?: number;
    /** Approximate word count of output. */
    wordCount?: number;
    /** Original file name. */
    fileName?: string;
}
/**
 * Result of routing a file through the parsing pipeline.
 */
export interface RouteResult {
    /** Extracted content as text or markdown. */
    content: string;
    /** Output format: 'markdown' or 'text'. */
    format: OutputFormat;
    /** Detected source format identifier. */
    sourceFormat: string;
    /** MIME type of the source. */
    mimeType?: string;
    /** File metadata. */
    metadata: FileMetadata;
    /** Warnings generated during parsing. */
    warnings: string[];
    /** Processing duration in milliseconds. */
    durationMs: number;
}
/**
 * Options for route() calls.
 */
export interface RouteOptions {
    /** Override auto-detected format. */
    format?: string;
    /** Preferred output format. */
    outputFormat?: OutputFormat;
    /** MIME type hint for detection. */
    mimeType?: string;
    /** Maximum output size in characters (0 = unlimited). */
    maxSize?: number;
    /** File name hint when input is a Buffer. */
    fileName?: string;
    /** Options for code file parsing. */
    codeOptions?: CodeOptions;
}
/**
 * Options specific to code file parsing.
 */
export interface CodeOptions {
    /** Include a file metadata header. */
    includeHeader?: boolean;
}
/**
 * Input to a parser.
 */
export interface ParserInput {
    /** The file content as a Buffer or string. */
    content: Buffer | string;
    /** Detected format info. */
    formatInfo: FormatInfo;
    /** Original file path if available. */
    filePath?: string;
    /** File name if available. */
    fileName?: string;
}
/**
 * Output from a parser.
 */
export interface ParserOutput {
    /** Parsed content. */
    content: string;
    /** Output format. */
    format: OutputFormat;
    /** Any warnings. */
    warnings?: string[];
}
/**
 * Parser interface — a module that can parse files of a given format.
 */
export interface Parser {
    /** Human-readable name. */
    name: string;
    /** Formats this parser handles (e.g. ['csv', 'tsv']). */
    formats: string[];
    /** Check if this parser can handle the given input. */
    canParse(input: ParserInput): boolean;
    /** Parse the input and return content. */
    parse(input: ParserInput, options?: RouteOptions): Promise<ParserOutput>;
}
/**
 * Batch route result for a single file in a batch.
 */
export interface BatchRouteResult {
    /** Source path or identifier. */
    source: string;
    /** Route result if successful. */
    result?: RouteResult;
    /** Error if parsing failed. */
    error?: string;
}
/**
 * Options for batch routing.
 */
export interface BatchOptions extends RouteOptions {
    /** Maximum number of files to process concurrently. */
    concurrency?: number;
    /** Glob patterns to include (default: all files). */
    include?: string[];
    /** Glob patterns to exclude. */
    exclude?: string[];
    /** Whether to scan directories recursively. */
    recursive?: boolean;
}
//# sourceMappingURL=types.d.ts.map