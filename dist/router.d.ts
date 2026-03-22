import { RouteResult, RouteOptions, Parser } from "./types.js";
import { ParserRegistry } from "./registry.js";
/**
 * Route a file through the optimal parsing pipeline.
 *
 * @param source - File path, Buffer, or string content.
 * @param options - Route options (format override, output format, MIME type, etc.).
 * @returns RouteResult with extracted content and metadata.
 */
export declare function route(source: string | Buffer, options?: RouteOptions): Promise<RouteResult>;
/**
 * Register a custom parser in the global registry.
 */
export declare function registerParser(parser: Parser): void;
/**
 * Get the global parser registry.
 */
export declare function getRegistry(): ParserRegistry;
//# sourceMappingURL=router.d.ts.map