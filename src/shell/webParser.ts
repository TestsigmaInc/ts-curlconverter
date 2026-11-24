// This file replaces Parser.ts when curlconverter is running in the browser.

import Parser from "web-tree-sitter";

export interface InitOptions {
  /** Where tree-sitter.wasm and tree-sitter-bash.wasm are served from. */
  wasmBaseUrl: string;
}

let ready: Parser | undefined;
let loading: Promise<void> | undefined;
// web-tree-sitter keeps its first init for the life of the page, so a runtime that failed to load stays failed.
let runtime: Promise<void> | undefined;
let lastError: unknown;

// Hosts pass a relative path ("/ui/assets/curl/") as often as a URL, so this joins rather than resolves.
const fileUrl = (base: string, name: string) =>
  (base.endsWith("/") ? base : `${base}/`) + name;

function loadRuntime(base: string): Promise<void> {
  runtime ??= new Promise<void>((resolve, reject) => {
    Parser.init({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      locateFile(scriptName: string, scriptDirectory: string) {
        return fileUrl(base, scriptName);
      },
      // A wasm that cannot be fetched or instantiated aborts, and Parser.init would never settle.
      onAbort(what: unknown) {
        reject(
          new Error(
            `tree-sitter.wasm could not be loaded from ${base}: ${String(what)}`,
          ),
        );
      },
    }).then(resolve, reject);
  });
  return runtime;
}

/** Loads the shell grammar; await it before converting. Later calls reuse the first load. */
export function init(options: InitOptions): Promise<void> {
  const base = options?.wasmBaseUrl;
  if (!base) {
    return Promise.reject(
      new Error(
        "initCurlConverter needs { wasmBaseUrl }, the folder serving the parser's wasm files",
      ),
    );
  }
  loading ??= (async () => {
    await loadRuntime(base);
    const Bash = await Parser.Language.load(
      fileUrl(base, "tree-sitter-bash.wasm"),
    );
    const parser = new Parser();
    parser.setLanguage(Bash);
    ready = parser;
  })().catch((error: unknown) => {
    loading = undefined;
    lastError = error;
    throw error;
  });
  return loading;
}

const parser = {
  parse(input: string): Parser.Tree {
    if (!ready) {
      throw Object.assign(
        new Error(
          "curl parser is not loaded yet: await initCurlConverter({ wasmBaseUrl }) before converting",
        ),
        { cause: lastError },
      );
    }
    return ready.parse(input);
  },
};

// Vite apps (groot) configure the URL through the env and still load on import, as before.
let envBaseUrl: string | undefined;
try {
  envBaseUrl = import.meta.env.VITE_TREE_SITTER_FILES_S3_URL;
} catch {
  envBaseUrl = undefined;
}
if (envBaseUrl) {
  // A failed load does not fail the import; converting then throws with the reason as its cause.
  await init({ wasmBaseUrl: envBaseUrl }).catch(() => undefined);
}

export default parser;
export type { Parser };
