import { BatchRouteResult, BatchOptions } from "./types.js";
/**
 * Route multiple files through the parsing pipeline.
 *
 * @param sources - Array of file paths or Buffers.
 * @param options - Batch options including concurrency.
 * @returns Array of BatchRouteResult.
 */
export declare function routeBatch(sources: Array<string | Buffer>, options?: BatchOptions): Promise<BatchRouteResult[]>;
/**
 * Route all files in a directory through the parsing pipeline.
 *
 * @param dirPath - Directory to scan.
 * @param options - Batch options including recursive flag and glob patterns.
 * @returns Array of BatchRouteResult.
 */
export declare function routeDirectory(dirPath: string, options?: BatchOptions): Promise<BatchRouteResult[]>;
//# sourceMappingURL=batch.d.ts.map