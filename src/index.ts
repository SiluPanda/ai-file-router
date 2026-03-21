// ai-file-router - Auto-detect file type and route through optimal parsing pipeline

// Core API
export { route, registerParser, getRegistry } from "./router.js";
export { routeBatch, routeDirectory } from "./batch.js";
export { detectFormat } from "./detect.js";
export { ParserRegistry } from "./registry.js";

// Types
export type {
  RouteResult,
  RouteOptions,
  OutputFormat,
  FormatInfo,
  DetectionMethod,
  FileMetadata,
  Parser,
  ParserInput,
  ParserOutput,
  CodeOptions,
  BatchRouteResult,
  BatchOptions,
} from "./types.js";

// Built-in parsers (for advanced use)
export { textParser, codeParser } from "./parsers/text.js";
export { markdownParser } from "./parsers/markdown.js";
export { htmlParser } from "./parsers/html.js";
export { jsonParser } from "./parsers/json.js";
export { csvParser } from "./parsers/csv.js";
export { yamlParser } from "./parsers/yaml.js";
export { binaryParser, imageParser } from "./parsers/binary.js";
