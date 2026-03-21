import { describe, it, expect } from "vitest";
import { ParserRegistry } from "../registry.js";
import { Parser, ParserInput, ParserOutput, FormatInfo } from "../types.js";

function makeInput(format: string, extra?: Partial<FormatInfo>): ParserInput {
  return {
    content: "",
    formatInfo: { format, confidence: 1.0, method: "explicit", ...extra },
  };
}

describe("ParserRegistry", () => {
  it("creates a registry with built-in parsers", () => {
    const registry = new ParserRegistry();
    const formats = registry.getSupportedFormats();
    expect(formats).toContain("text");
    expect(formats).toContain("code");
    expect(formats).toContain("markdown");
    expect(formats).toContain("html");
    expect(formats).toContain("xml");
    expect(formats).toContain("json");
    expect(formats).toContain("csv");
    expect(formats).toContain("tsv");
    expect(formats).toContain("yaml");
    expect(formats).toContain("toml");
    expect(formats).toContain("pdf");
    expect(formats).toContain("docx");
    expect(formats).toContain("image");
  });

  it("finds built-in parser for text format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("text"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("text");
  });

  it("finds built-in parser for code format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("code"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("code");
  });

  it("finds built-in parser for markdown format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("markdown"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("markdown");
  });

  it("finds built-in parser for html format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("html"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("html");
  });

  it("finds built-in parser for json format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("json"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("json");
  });

  it("finds built-in parser for csv format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("csv"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("csv");
  });

  it("finds built-in parser for yaml format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("yaml"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("yaml");
  });

  it("finds built-in parser for pdf (binary) format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("pdf"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("binary");
  });

  it("finds built-in parser for image format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("image"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("image");
  });

  it("returns null for unknown format", () => {
    const registry = new ParserRegistry();
    const parser = registry.findParser(makeInput("unknown_format_xyz"));
    expect(parser).toBeNull();
  });

  it("custom parsers take priority over built-in", () => {
    const registry = new ParserRegistry();

    const customParser: Parser = {
      name: "custom-json",
      formats: ["json"],
      canParse: (input: ParserInput) => input.formatInfo.format === "json",
      parse: async (): Promise<ParserOutput> => ({
        content: "custom output",
        format: "text",
      }),
    };

    registry.register(customParser);

    const parser = registry.findParser(makeInput("json"));
    expect(parser).not.toBeNull();
    expect(parser!.name).toBe("custom-json");
  });

  it("registers multiple custom parsers", () => {
    const registry = new ParserRegistry();

    const parser1: Parser = {
      name: "custom-1",
      formats: ["custom"],
      canParse: (input: ParserInput) => input.formatInfo.format === "custom",
      parse: async (): Promise<ParserOutput> => ({ content: "", format: "text" }),
    };

    const parser2: Parser = {
      name: "custom-2",
      formats: ["custom2"],
      canParse: (input: ParserInput) => input.formatInfo.format === "custom2",
      parse: async (): Promise<ParserOutput> => ({ content: "", format: "text" }),
    };

    registry.register(parser1);
    registry.register(parser2);

    expect(registry.findParser(makeInput("custom"))!.name).toBe("custom-1");
    expect(registry.findParser(makeInput("custom2"))!.name).toBe("custom-2");
  });

  it("getAllParsers returns all parsers", () => {
    const registry = new ParserRegistry();
    const parsers = registry.getAllParsers();
    expect(parsers.length).toBeGreaterThan(0);

    const customParser: Parser = {
      name: "extra",
      formats: ["extra"],
      canParse: () => false,
      parse: async (): Promise<ParserOutput> => ({ content: "", format: "text" }),
    };
    registry.register(customParser);

    const allParsers = registry.getAllParsers();
    expect(allParsers.length).toBe(parsers.length + 1);
    expect(allParsers[0].name).toBe("extra"); // custom comes first
  });

  it("getSupportedFormats includes custom formats", () => {
    const registry = new ParserRegistry();

    const customParser: Parser = {
      name: "dwg-parser",
      formats: ["dwg"],
      canParse: (input: ParserInput) => input.formatInfo.format === "dwg",
      parse: async (): Promise<ParserOutput> => ({ content: "", format: "text" }),
    };

    registry.register(customParser);
    const formats = registry.getSupportedFormats();
    expect(formats).toContain("dwg");
  });
});
