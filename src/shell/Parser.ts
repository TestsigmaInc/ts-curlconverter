// Node build. The native grammar is loaded at run time, so a bundler that resolves this
// file for a server build never has to find the optional tree-sitter packages.
import Module from "node:module";
import type Parser from "web-tree-sitter";

export interface InitOptions {
  /** Where tree-sitter.wasm and tree-sitter-bash.wasm are served from; used only by the browser build. */
  wasmBaseUrl: string;
}

const MISSING =
  "curl parsing in Node needs the tree-sitter and tree-sitter-bash packages installed";

function loadNative(): { parser?: Parser; error?: Error } {
  try {
    const nodeRequire = Module.createRequire(import.meta.url);
    const NativeParser = nodeRequire(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ "tree-sitter",
    );
    const Bash = nodeRequire(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ "tree-sitter-bash",
    );
    const native = new NativeParser();
    native.setLanguage(Bash);
    return { parser: native as Parser };
  } catch (cause) {
    return { error: Object.assign(new Error(MISSING), { cause }) };
  }
}

const native = loadNative();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function init(options: InitOptions): Promise<void> {
  return native.error ? Promise.reject(native.error) : Promise.resolve();
}

const parser = {
  parse(input: string): Parser.Tree {
    if (!native.parser) throw native.error;
    return native.parser.parse(input);
  },
};

export default parser;
export type { Parser };
