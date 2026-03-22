"use strict";
// ai-file-router - Auto-detect file type and route through optimal parsing pipeline
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageParser = exports.binaryParser = exports.yamlParser = exports.csvParser = exports.jsonParser = exports.htmlParser = exports.markdownParser = exports.codeParser = exports.textParser = exports.ParserRegistry = exports.detectFormat = exports.routeDirectory = exports.routeBatch = exports.getRegistry = exports.registerParser = exports.route = void 0;
// Core API
var router_js_1 = require("./router.js");
Object.defineProperty(exports, "route", { enumerable: true, get: function () { return router_js_1.route; } });
Object.defineProperty(exports, "registerParser", { enumerable: true, get: function () { return router_js_1.registerParser; } });
Object.defineProperty(exports, "getRegistry", { enumerable: true, get: function () { return router_js_1.getRegistry; } });
var batch_js_1 = require("./batch.js");
Object.defineProperty(exports, "routeBatch", { enumerable: true, get: function () { return batch_js_1.routeBatch; } });
Object.defineProperty(exports, "routeDirectory", { enumerable: true, get: function () { return batch_js_1.routeDirectory; } });
var detect_js_1 = require("./detect.js");
Object.defineProperty(exports, "detectFormat", { enumerable: true, get: function () { return detect_js_1.detectFormat; } });
var registry_js_1 = require("./registry.js");
Object.defineProperty(exports, "ParserRegistry", { enumerable: true, get: function () { return registry_js_1.ParserRegistry; } });
// Built-in parsers (for advanced use)
var text_js_1 = require("./parsers/text.js");
Object.defineProperty(exports, "textParser", { enumerable: true, get: function () { return text_js_1.textParser; } });
Object.defineProperty(exports, "codeParser", { enumerable: true, get: function () { return text_js_1.codeParser; } });
var markdown_js_1 = require("./parsers/markdown.js");
Object.defineProperty(exports, "markdownParser", { enumerable: true, get: function () { return markdown_js_1.markdownParser; } });
var html_js_1 = require("./parsers/html.js");
Object.defineProperty(exports, "htmlParser", { enumerable: true, get: function () { return html_js_1.htmlParser; } });
var json_js_1 = require("./parsers/json.js");
Object.defineProperty(exports, "jsonParser", { enumerable: true, get: function () { return json_js_1.jsonParser; } });
var csv_js_1 = require("./parsers/csv.js");
Object.defineProperty(exports, "csvParser", { enumerable: true, get: function () { return csv_js_1.csvParser; } });
var yaml_js_1 = require("./parsers/yaml.js");
Object.defineProperty(exports, "yamlParser", { enumerable: true, get: function () { return yaml_js_1.yamlParser; } });
var binary_js_1 = require("./parsers/binary.js");
Object.defineProperty(exports, "binaryParser", { enumerable: true, get: function () { return binary_js_1.binaryParser; } });
Object.defineProperty(exports, "imageParser", { enumerable: true, get: function () { return binary_js_1.imageParser; } });
//# sourceMappingURL=index.js.map