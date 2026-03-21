import { Parser, ParserInput, ParserOutput, RouteOptions } from "../types.js";

/**
 * HTML parser: strips tags, extracts text, preserves structure as markdown.
 * Zero-dependency implementation.
 */
export const htmlParser: Parser = {
  name: "html",
  formats: ["html", "xml"],

  canParse(input: ParserInput): boolean {
    return input.formatInfo.format === "html" || input.formatInfo.format === "xml";
  },

  async parse(input: ParserInput, _options?: RouteOptions): Promise<ParserOutput> {
    const content =
      typeof input.content === "string"
        ? input.content
        : input.content.toString("utf-8");

    if (input.formatInfo.format === "xml") {
      return parseXml(content);
    }

    return parseHtml(content);
  },
};

function parseHtml(html: string): ParserOutput {
  // Remove script and style blocks
  let cleaned = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  // Remove head, nav, footer, aside (common non-content elements)
  cleaned = cleaned.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "");
  cleaned = cleaned.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "");
  cleaned = cleaned.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "");

  // Process the HTML by replacing tags with markdown equivalents
  let result = cleaned;

  // Pre/code blocks (must come before inline code)
  result = result.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_m, text) => {
    return `\n\`\`\`\n${decodeHtmlEntities(text).trim()}\n\`\`\`\n`;
  });
  result = result.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, text) => {
    return `\n\`\`\`\n${decodeHtmlEntities(stripTags(text)).trim()}\n\`\`\`\n`;
  });

  // Inline elements first (before block elements strip tags)
  // Bold (use word boundary \b to avoid matching <body>, <br>, etc.)
  result = result.replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**");
  // Italic (use word boundary \b to avoid matching <img>, <iframe>, etc.)
  result = result.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");
  // Code
  result = result.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  // Links
  result = result.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
    const linkText = stripTags(text).trim();
    return `[${linkText}](${href})`;
  });

  // Headings
  for (let i = 6; i >= 1; i--) {
    const re = new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, "gi");
    result = result.replace(re, (_m, text) => {
      const prefix = "#".repeat(i);
      return `\n${prefix} ${stripTags(text).trim()}\n`;
    });
  }

  // Paragraphs (stripTags preserves already-converted markdown)
  result = result.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, text) => {
    return `\n${stripTags(text).trim()}\n`;
  });

  // Line breaks
  result = result.replace(/<br\s*\/?>/gi, "\n");

  // Unordered lists
  result = result.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, items) => {
    return "\n" + items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_im: string, text: string) => {
      return `- ${stripTags(text).trim()}\n`;
    });
  });

  // Ordered lists
  result = result.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, items) => {
    let idx = 0;
    return "\n" + items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_im: string, text: string) => {
      idx++;
      return `${idx}. ${stripTags(text).trim()}\n`;
    });
  });

  // Tables
  result = result.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_m, tableContent) => {
    return convertTableToMarkdown(tableContent);
  });

  // Blockquote
  result = result.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, text) => {
    const bqLines = stripTags(text).trim().split("\n");
    return "\n" + bqLines.map((l: string) => `> ${l}`).join("\n") + "\n";
  });

  // Strip remaining tags
  result = stripTags(result);

  // Decode HTML entities
  result = decodeHtmlEntities(result);

  // Clean up whitespace
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return {
    content: result,
    format: "markdown",
  };
}

function parseXml(xml: string): ParserOutput {
  // For XML, wrap in a code fence
  const cleaned = xml
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trimEnd();

  return {
    content: "```xml\n" + cleaned + "\n```",
    format: "markdown",
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&nbsp;/g, " ");
}

function convertTableToMarkdown(tableHtml: string): string {
  const rows: string[][] = [];

  // Extract rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(stripTags(cellMatch[1]).trim());
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return "";

  // Normalize column count
  const maxCols = Math.max(...rows.map((r) => r.length));
  for (const row of rows) {
    while (row.length < maxCols) {
      row.push("");
    }
  }

  // Build markdown table
  const lines: string[] = [];
  // Header row
  lines.push("| " + rows[0].map((c) => c || " ").join(" | ") + " |");
  // Separator
  lines.push("| " + rows[0].map(() => "---").join(" | ") + " |");
  // Data rows
  for (let i = 1; i < rows.length; i++) {
    lines.push("| " + rows[i].map((c) => c || " ").join(" | ") + " |");
  }

  return "\n" + lines.join("\n") + "\n";
}
