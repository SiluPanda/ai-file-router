"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const registry_js_1 = require("../registry.js");
function makeInput(format, extra) {
    return {
        content: "",
        formatInfo: { format, confidence: 1.0, method: "explicit", ...extra },
    };
}
(0, vitest_1.describe)("ParserRegistry", () => {
    (0, vitest_1.it)("creates a registry with built-in parsers", () => {
        const registry = new registry_js_1.ParserRegistry();
        const formats = registry.getSupportedFormats();
        (0, vitest_1.expect)(formats).toContain("text");
        (0, vitest_1.expect)(formats).toContain("code");
        (0, vitest_1.expect)(formats).toContain("markdown");
        (0, vitest_1.expect)(formats).toContain("html");
        (0, vitest_1.expect)(formats).toContain("xml");
        (0, vitest_1.expect)(formats).toContain("json");
        (0, vitest_1.expect)(formats).toContain("csv");
        (0, vitest_1.expect)(formats).toContain("tsv");
        (0, vitest_1.expect)(formats).toContain("yaml");
        (0, vitest_1.expect)(formats).toContain("toml");
        (0, vitest_1.expect)(formats).toContain("pdf");
        (0, vitest_1.expect)(formats).toContain("docx");
        (0, vitest_1.expect)(formats).toContain("image");
    });
    (0, vitest_1.it)("finds built-in parser for text format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("text"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("text");
    });
    (0, vitest_1.it)("finds built-in parser for code format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("code"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("code");
    });
    (0, vitest_1.it)("finds built-in parser for markdown format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("markdown"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("markdown");
    });
    (0, vitest_1.it)("finds built-in parser for html format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("html"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("html");
    });
    (0, vitest_1.it)("finds built-in parser for json format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("json"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("json");
    });
    (0, vitest_1.it)("finds built-in parser for csv format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("csv"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("csv");
    });
    (0, vitest_1.it)("finds built-in parser for yaml format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("yaml"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("yaml");
    });
    (0, vitest_1.it)("finds built-in parser for pdf (binary) format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("pdf"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("binary");
    });
    (0, vitest_1.it)("finds built-in parser for image format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("image"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("image");
    });
    (0, vitest_1.it)("returns null for unknown format", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser = registry.findParser(makeInput("unknown_format_xyz"));
        (0, vitest_1.expect)(parser).toBeNull();
    });
    (0, vitest_1.it)("custom parsers take priority over built-in", () => {
        const registry = new registry_js_1.ParserRegistry();
        const customParser = {
            name: "custom-json",
            formats: ["json"],
            canParse: (input) => input.formatInfo.format === "json",
            parse: async () => ({
                content: "custom output",
                format: "text",
            }),
        };
        registry.register(customParser);
        const parser = registry.findParser(makeInput("json"));
        (0, vitest_1.expect)(parser).not.toBeNull();
        (0, vitest_1.expect)(parser.name).toBe("custom-json");
    });
    (0, vitest_1.it)("registers multiple custom parsers", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parser1 = {
            name: "custom-1",
            formats: ["custom"],
            canParse: (input) => input.formatInfo.format === "custom",
            parse: async () => ({ content: "", format: "text" }),
        };
        const parser2 = {
            name: "custom-2",
            formats: ["custom2"],
            canParse: (input) => input.formatInfo.format === "custom2",
            parse: async () => ({ content: "", format: "text" }),
        };
        registry.register(parser1);
        registry.register(parser2);
        (0, vitest_1.expect)(registry.findParser(makeInput("custom")).name).toBe("custom-1");
        (0, vitest_1.expect)(registry.findParser(makeInput("custom2")).name).toBe("custom-2");
    });
    (0, vitest_1.it)("getAllParsers returns all parsers", () => {
        const registry = new registry_js_1.ParserRegistry();
        const parsers = registry.getAllParsers();
        (0, vitest_1.expect)(parsers.length).toBeGreaterThan(0);
        const customParser = {
            name: "extra",
            formats: ["extra"],
            canParse: () => false,
            parse: async () => ({ content: "", format: "text" }),
        };
        registry.register(customParser);
        const allParsers = registry.getAllParsers();
        (0, vitest_1.expect)(allParsers.length).toBe(parsers.length + 1);
        (0, vitest_1.expect)(allParsers[0].name).toBe("extra"); // custom comes first
    });
    (0, vitest_1.it)("getSupportedFormats includes custom formats", () => {
        const registry = new registry_js_1.ParserRegistry();
        const customParser = {
            name: "dwg-parser",
            formats: ["dwg"],
            canParse: (input) => input.formatInfo.format === "dwg",
            parse: async () => ({ content: "", format: "text" }),
        };
        registry.register(customParser);
        const formats = registry.getSupportedFormats();
        (0, vitest_1.expect)(formats).toContain("dwg");
    });
});
//# sourceMappingURL=registry.test.js.map