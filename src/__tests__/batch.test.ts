import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { routeBatch, routeDirectory } from "../batch.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ai-file-router-batch-"));
}

function writeFile(dir: string, name: string, content: string): string {
  const fp = path.join(dir, name);
  fs.writeFileSync(fp, content);
  return fp;
}

function cleanupDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

describe("routeBatch", () => {
  it("routes multiple files", async () => {
    const dir = createTempDir();
    try {
      const f1 = writeFile(dir, "a.txt", "Hello");
      const f2 = writeFile(dir, "b.json", '{"key": "value"}');
      const f3 = writeFile(dir, "c.csv", "Name,Age\nAlice,30");

      const results = await routeBatch([f1, f2, f3]);
      expect(results).toHaveLength(3);

      const txtResult = results.find((r) => r.source.endsWith("a.txt"));
      expect(txtResult).toBeDefined();
      expect(txtResult!.result).toBeDefined();
      expect(txtResult!.result!.content).toBe("Hello");

      const jsonResult = results.find((r) => r.source.endsWith("b.json"));
      expect(jsonResult).toBeDefined();
      expect(jsonResult!.result!.content).toContain("```json");

      const csvResult = results.find((r) => r.source.endsWith("c.csv"));
      expect(csvResult).toBeDefined();
      expect(csvResult!.result!.content).toContain("| Name | Age |");
    } finally {
      cleanupDir(dir);
    }
  });

  it("handles errors gracefully in batch", async () => {
    const dir = createTempDir();
    try {
      const f1 = writeFile(dir, "good.txt", "OK");
      const f2 = "/tmp/nonexistent-file-batch-test-xyz.txt";

      const results = await routeBatch([f1, f2]);
      expect(results).toHaveLength(2);

      const goodResult = results.find((r) => r.source.endsWith("good.txt"));
      expect(goodResult!.result).toBeDefined();
      expect(goodResult!.result!.content).toBe("OK");

      const badResult = results.find((r) => r.source.includes("nonexistent"));
      expect(badResult).toBeDefined();
      // The route function returns a result with warnings for file errors
      if (badResult!.result) {
        expect(badResult!.result.warnings.length).toBeGreaterThan(0);
      } else {
        expect(badResult!.error).toBeDefined();
      }
    } finally {
      cleanupDir(dir);
    }
  });

  it("processes Buffer inputs in batch", async () => {
    const results = await routeBatch([
      Buffer.from("buffer content 1"),
      Buffer.from("buffer content 2"),
    ]);
    expect(results).toHaveLength(2);
    // Buffer sources are labeled "(buffer)"
    expect(results.every((r) => r.source === "(buffer)")).toBe(true);
  });

  it("respects concurrency option", async () => {
    const dir = createTempDir();
    try {
      const files: string[] = [];
      for (let i = 0; i < 10; i++) {
        files.push(writeFile(dir, `file${i}.txt`, `Content ${i}`));
      }

      const results = await routeBatch(files, { concurrency: 2 });
      expect(results).toHaveLength(10);
      for (const r of results) {
        expect(r.result).toBeDefined();
      }
    } finally {
      cleanupDir(dir);
    }
  });

  it("handles empty batch", async () => {
    const results = await routeBatch([]);
    expect(results).toHaveLength(0);
  });
});

describe("routeDirectory", () => {
  it("routes all files in a directory", async () => {
    const dir = createTempDir();
    try {
      writeFile(dir, "a.txt", "Text file");
      writeFile(dir, "b.json", "{}");
      writeFile(dir, "c.md", "# Title");

      const results = await routeDirectory(dir);
      expect(results).toHaveLength(3);

      for (const r of results) {
        expect(r.result).toBeDefined();
        expect(r.result!.content.length).toBeGreaterThan(0);
      }
    } finally {
      cleanupDir(dir);
    }
  });

  it("routes files recursively", async () => {
    const dir = createTempDir();
    const subDir = path.join(dir, "sub");
    fs.mkdirSync(subDir);
    try {
      writeFile(dir, "root.txt", "Root file");
      writeFile(subDir, "nested.txt", "Nested file");

      const results = await routeDirectory(dir, { recursive: true });
      expect(results).toHaveLength(2);
    } finally {
      cleanupDir(dir);
    }
  });

  it("skips node_modules and .git directories", async () => {
    const dir = createTempDir();
    const nmDir = path.join(dir, "node_modules");
    const gitDir = path.join(dir, ".git");
    fs.mkdirSync(nmDir);
    fs.mkdirSync(gitDir);
    try {
      writeFile(dir, "app.txt", "App");
      writeFile(nmDir, "dep.txt", "Dependency");
      writeFile(gitDir, "obj.txt", "Git object");

      const results = await routeDirectory(dir);
      expect(results).toHaveLength(1);
      expect(results[0].source).toContain("app.txt");
    } finally {
      cleanupDir(dir);
    }
  });

  it("handles non-existent directory", async () => {
    const results = await routeDirectory("/tmp/nonexistent-dir-test-xyz");
    expect(results).toHaveLength(0);
  });

  it("handles include filter", async () => {
    const dir = createTempDir();
    try {
      writeFile(dir, "a.txt", "Text");
      writeFile(dir, "b.json", "{}");
      writeFile(dir, "c.csv", "a,b");

      const results = await routeDirectory(dir, { include: ["*.txt"] });
      expect(results).toHaveLength(1);
      expect(results[0].source).toContain("a.txt");
    } finally {
      cleanupDir(dir);
    }
  });

  it("handles exclude filter", async () => {
    const dir = createTempDir();
    try {
      writeFile(dir, "keep.txt", "Keep");
      writeFile(dir, "skip.json", "{}");

      const results = await routeDirectory(dir, { exclude: ["*.json"] });
      expect(results).toHaveLength(1);
      expect(results[0].source).toContain("keep.txt");
    } finally {
      cleanupDir(dir);
    }
  });

  it("handles empty directory", async () => {
    const dir = createTempDir();
    try {
      const results = await routeDirectory(dir);
      expect(results).toHaveLength(0);
    } finally {
      cleanupDir(dir);
    }
  });
});
