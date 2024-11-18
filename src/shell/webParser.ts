// This file replaces Parser.ts when curlconverter is running in the browser.
require('dotenv').config({ path: '.env' });
import Parser from "web-tree-sitter";

// NOTE: top-level await requires Safari 15+
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#browser_compatibility
await Parser.init({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  locateFile(scriptName: string, scriptDirectory: string) {
    return process.env.VITE_TREE_SITTER_PATH;
  },
});
const Bash = await Parser.Language.load(process.env.VITE_TREE_SITTER_BASH_PATH || '');
const parser = new Parser();
parser.setLanguage(Bash);

export default parser;
export type { Parser };
