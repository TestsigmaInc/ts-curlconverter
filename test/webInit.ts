// The browser parser, run in Node: web-tree-sitter reads the wasm files from disk the same way.
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import test from "tape";

import parser, { init } from "../src/shell/webParser.js";
import { toJsonObject } from "../src/index.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function wasmFolder(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "curl-wasm-"));
  fs.copyFileSync(
    path.join(root, "node_modules/web-tree-sitter/tree-sitter.wasm"),
    path.join(dir, "tree-sitter.wasm"),
  );
  fs.copyFileSync(
    path.join(root, "dist/tree-sitter-bash.wasm"),
    path.join(dir, "tree-sitter-bash.wasm"),
  );
  return dir;
}

test("converting before init says to call it with the wasm base", (t) => {
  t.throws(
    () => parser.parse("curl x"),
    /await initCurlConverter\(\{ wasmBaseUrl \}\)/,
  );
  t.end();
});

test("init without a wasm base rejects instead of throwing", async (t) => {
  // @ts-expect-error: the options are required, checked here for plain JavaScript callers.
  const pending = init(undefined);
  await pending.then(
    () => t.fail("resolved"),
    (error: Error) => t.match(error.message, /needs \{ wasmBaseUrl \}/),
  );
});

test("a base missing its bash grammar rejects, and a later init with the right base loads", async (t) => {
  const dir = wasmFolder();
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "curl-wasm-"));
  fs.copyFileSync(
    path.join(dir, "tree-sitter.wasm"),
    path.join(empty, "tree-sitter.wasm"),
  );
  await init({ wasmBaseUrl: empty }).then(
    () => t.fail("resolved"),
    () => t.pass("rejected"),
  );
  t.throws(
    () => parser.parse("curl x"),
    (e: Error & { cause?: unknown }) => e.cause !== undefined,
    "keeps the reason as the cause",
  );
  await init({ wasmBaseUrl: dir });
  t.equal(parser.parse("curl https://x.io").rootNode.type, "program");
  t.equal(
    init({ wasmBaseUrl: dir }),
    init({ wasmBaseUrl: "/elsewhere/" }),
    "reuses the first load",
  );
});

test("keepJsonText answers a JSON body as the text given", (t) => {
  const command = `curl https://x.io -H 'Content-Type: application/json' --data-raw '{"id": 12345678901234567890, "v": 1.50}'`;
  t.deepEqual(toJsonObject(command).data, { id: 12345678901234567000, v: 1.5 });
  t.equal(
    toJsonObject(command, { keepJsonText: true }).data,
    '{"id": 12345678901234567890, "v": 1.50}',
  );
  t.end();
});
