"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
const batch_js_1 = require("../batch.js");
function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "ai-file-router-batch-"));
}
function writeFile(dir, name, content) {
    const fp = path.join(dir, name);
    fs.writeFileSync(fp, content);
    return fp;
}
function cleanupDir(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch {
        // ignore
    }
}
(0, vitest_1.describe)("routeBatch", () => {
    (0, vitest_1.it)("routes multiple files", async () => {
        const dir = createTempDir();
        try {
            const f1 = writeFile(dir, "a.txt", "Hello");
            const f2 = writeFile(dir, "b.json", '{"key": "value"}');
            const f3 = writeFile(dir, "c.csv", "Name,Age\nAlice,30");
            const results = await (0, batch_js_1.routeBatch)([f1, f2, f3]);
            (0, vitest_1.expect)(results).toHaveLength(3);
            const txtResult = results.find((r) => r.source.endsWith("a.txt"));
            (0, vitest_1.expect)(txtResult).toBeDefined();
            (0, vitest_1.expect)(txtResult.result).toBeDefined();
            (0, vitest_1.expect)(txtResult.result.content).toBe("Hello");
            const jsonResult = results.find((r) => r.source.endsWith("b.json"));
            (0, vitest_1.expect)(jsonResult).toBeDefined();
            (0, vitest_1.expect)(jsonResult.result.content).toContain("```json");
            const csvResult = results.find((r) => r.source.endsWith("c.csv"));
            (0, vitest_1.expect)(csvResult).toBeDefined();
            (0, vitest_1.expect)(csvResult.result.content).toContain("| Name | Age |");
        }
        finally {
            cleanupDir(dir);
        }
    });
    (0, vitest_1.it)("handles errors gracefully in batch", async () => {
        const dir = createTempDir();
        try {
            const f1 = writeFile(dir, "good.txt", "OK");
            const f2 = "/tmp/nonexistent-file-batch-test-xyz.txt";
            const results = await (0, batch_js_1.routeBatch)([f1, f2]);
            (0, vitest_1.expect)(results).toHaveLength(2);
            const goodResult = results.find((r) => r.source.endsWith("good.txt"));
            (0, vitest_1.expect)(goodResult.result).toBeDefined();
            (0, vitest_1.expect)(goodResult.result.content).toBe("OK");
            const badResult = results.find((r) => r.source.includes("nonexistent"));
            (0, vitest_1.expect)(badResult).toBeDefined();
            // The route function returns a result with warnings for file errors
            if (badResult.result) {
                (0, vitest_1.expect)(badResult.result.warnings.length).toBeGreaterThan(0);
            }
            else {
                (0, vitest_1.expect)(badResult.error).toBeDefined();
            }
        }
        finally {
            cleanupDir(dir);
        }
    });
    (0, vitest_1.it)("processes Buffer inputs in batch", async () => {
        const results = await (0, batch_js_1.routeBatch)([
            Buffer.from("buffer content 1"),
            Buffer.from("buffer content 2"),
        ]);
        (0, vitest_1.expect)(results).toHaveLength(2);
        // Buffer sources are labeled "(buffer)"
        (0, vitest_1.expect)(results.every((r) => r.source === "(buffer)")).toBe(true);
    });
    (0, vitest_1.it)("respects concurrency option", async () => {
        const dir = createTempDir();
        try {
            const files = [];
            for (let i = 0; i < 10; i++) {
                files.push(writeFile(dir, `file${i}.txt`, `Content ${i}`));
            }
            const results = await (0, batch_js_1.routeBatch)(files, { concurrency: 2 });
            (0, vitest_1.expect)(results).toHaveLength(10);
            for (const r of results) {
                (0, vitest_1.expect)(r.result).toBeDefined();
            }
        }
        finally {
            cleanupDir(dir);
        }
    });
    (0, vitest_1.it)("handles empty batch", async () => {
        const results = await (0, batch_js_1.routeBatch)([]);
        (0, vitest_1.expect)(results).toHaveLength(0);
    });
});
(0, vitest_1.describe)("routeDirectory", () => {
    (0, vitest_1.it)("routes all files in a directory", async () => {
        const dir = createTempDir();
        try {
            writeFile(dir, "a.txt", "Text file");
            writeFile(dir, "b.json", "{}");
            writeFile(dir, "c.md", "# Title");
            const results = await (0, batch_js_1.routeDirectory)(dir);
            (0, vitest_1.expect)(results).toHaveLength(3);
            for (const r of results) {
                (0, vitest_1.expect)(r.result).toBeDefined();
                (0, vitest_1.expect)(r.result.content.length).toBeGreaterThan(0);
            }
        }
        finally {
            cleanupDir(dir);
        }
    });
    (0, vitest_1.it)("routes files recursively", async () => {
        const dir = createTempDir();
        const subDir = path.join(dir, "sub");
        fs.mkdirSync(subDir);
        try {
            writeFile(dir, "root.txt", "Root file");
            writeFile(subDir, "nested.txt", "Nested file");
            const results = await (0, batch_js_1.routeDirectory)(dir, { recursive: true });
            (0, vitest_1.expect)(results).toHaveLength(2);
        }
        finally {
            cleanupDir(dir);
        }
    });
    (0, vitest_1.it)("skips node_modules and .git directories", async () => {
        const dir = createTempDir();
        const nmDir = path.join(dir, "node_modules");
        const gitDir = path.join(dir, ".git");
        fs.mkdirSync(nmDir);
        fs.mkdirSync(gitDir);
        try {
            writeFile(dir, "app.txt", "App");
            writeFile(nmDir, "dep.txt", "Dependency");
            writeFile(gitDir, "obj.txt", "Git object");
            const results = await (0, batch_js_1.routeDirectory)(dir);
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].source).toContain("app.txt");
        }
        finally {
            cleanupDir(dir);
        }
    });
    (0, vitest_1.it)("handles non-existent directory", async () => {
        const results = await (0, batch_js_1.routeDirectory)("/tmp/nonexistent-dir-test-xyz");
        (0, vitest_1.expect)(results).toHaveLength(0);
    });
    (0, vitest_1.it)("handles include filter", async () => {
        const dir = createTempDir();
        try {
            writeFile(dir, "a.txt", "Text");
            writeFile(dir, "b.json", "{}");
            writeFile(dir, "c.csv", "a,b");
            const results = await (0, batch_js_1.routeDirectory)(dir, { include: ["*.txt"] });
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].source).toContain("a.txt");
        }
        finally {
            cleanupDir(dir);
        }
    });
    (0, vitest_1.it)("handles exclude filter", async () => {
        const dir = createTempDir();
        try {
            writeFile(dir, "keep.txt", "Keep");
            writeFile(dir, "skip.json", "{}");
            const results = await (0, batch_js_1.routeDirectory)(dir, { exclude: ["*.json"] });
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].source).toContain("keep.txt");
        }
        finally {
            cleanupDir(dir);
        }
    });
    (0, vitest_1.it)("handles empty directory", async () => {
        const dir = createTempDir();
        try {
            const results = await (0, batch_js_1.routeDirectory)(dir);
            (0, vitest_1.expect)(results).toHaveLength(0);
        }
        finally {
            cleanupDir(dir);
        }
    });
});
//# sourceMappingURL=batch.test.js.map