// Its own process: web-tree-sitter keeps the first runtime load for the life of the page.
import os from "os";
import fs from "fs";
import path from "path";

import test from "tape";

import { init } from "../src/shell/webParser.js";

test("a tree-sitter.wasm that cannot load rejects instead of hanging, and stays failed", async (t) => {
  const missing = fs.mkdtempSync(path.join(os.tmpdir(), "curl-wasm-"));
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve("hung"), 5000),
  );
  const first = await Promise.race([
    init({ wasmBaseUrl: missing }).then(
      () => "resolved",
      (e: Error) => e.message,
    ),
    timeout,
  ]);
  t.match(String(first), /tree-sitter\.wasm could not be loaded/);
  const again = await Promise.race([
    init({ wasmBaseUrl: missing }).then(
      () => "resolved",
      (e: Error) => e.message,
    ),
    timeout,
  ]);
  t.match(String(again), /tree-sitter\.wasm could not be loaded/);
  t.end();
  process.exit(0);
});
