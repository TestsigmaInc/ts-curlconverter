# [curlconverter](https://curlconverter.com)

Transpile [`curl`](https://en.wikipedia.org/wiki/CURL) commands into C, C#, ColdFusion, Clojure, Dart, Elixir, Go, HTTPie, Java, JavaScript, Julia, Kotlin, Lua, MATLAB, Objective-C, OCaml, Perl, PHP, PowerShell, Python, R, Ruby, Rust, Swift, Wget, Ansible, HAR, HTTP or JSON.

Try it on [curlconverter.com](https://curlconverter.com) or as a drop-in `curl` replacement:

```shell
$ curlconverter --data "hello=world" example.com
import requests

data = {
    'hello': 'world',
}

response = requests.post('http://example.com', data=data)
```

Features:

- Implements a lot of curl's argument parsing logic
  - Knows about all 255 curl arguments but most are ignored
  - Supports shortening `-O -v -X POST` to `-OvXPOST`
  - `--data @filename` generates code that reads that file and `@-` reads stdin
- Understands Bash syntax
  - [ANSI-C quoted](https://www.gnu.org/software/bash/manual/bash.html#ANSI_002dC-Quoting) strings
  - stdin redirects and [heredocs](https://www.gnu.org/software/bash/manual/bash.html#Here-Documents)
  - Generated code reads environment variables and runs subcommands
  - Ignores comments
  - Reports syntax errors
- Converts JSON data to native objects
- Warns about issues with the conversion

Limitations:

- Only HTTP is supported
- Code generators for other languages are less thorough than the Python generator
- curl doesn't follow redirects or decompress gzip-compressed responses by default, but the generated code will do whatever the default is for that runtime, to keep it shorter. For example Python's Requests library [follows redirects by default](https://requests.readthedocs.io/en/latest/user/quickstart/#redirection-and-history), so unless you explicitly set the redirect policy with `-L`/`--location`/`--no-location`, the generated code will not handle redirects the same way as the curl command
- Shell variables can arbitrarily change how the command would be parsed at runtime. The command `curl $VAR` can do anything, depending on what's in `$VAR`. curlconverter assumes that environment variables don't contain characters that would affect parsing
- Only simple subcommands such as `curl $(echo example.com)` work, more complicated subcommands (such as nested commands or subcommands that redirect the output) won't generate valid code
- The Bash parser doesn't support all Bash syntax
- and much more

## Install

Install the command line tool with

```sh
npm install --global curlconverter
```

Install the JavaScript library for use in your own projects with

```sh
npm install curlconverter
```

curlconverter requires Node 12+.

## Usage

### Usage from the command line

`curlconverter` acts as a drop-in replacement for curl. Take any curl command, change "`curl`" to "`curlconverter`" and it will print code instead of making the request

```shell
$ curlconverter example.com
import requests

response = requests.get('http://example.com')
```

To read the curl command from stdin, pass `-`

```shell
$ echo 'curl example.com' | curlconverter -
import requests

response = requests.get('http://example.com')
```

Choose the output language by passing `--language <language>`. The options are

- `ansible`
- `c`
- `cfml`
- `clojure`
- `csharp`
- `dart`
- `elixir`
- `go`
- `har`
- `http`
- `httpie`
- `java`, `java-httpurlconnection`, `java-jsoup`, `java-okhttp`
- `javascript`, `javascript-jquery`, `javascript-xhr`
- `json`
- `julia`
- `kotlin`
- `lua`
- `matlab`
- `node`, `node-http`, `node-axios`, `node-got`, `node-ky`, `node-request`, `node-superagent`
- `objc`
- `ocaml`
- `perl`
- `php`, `php-guzzle`, `php-requests`
- `powershell`, `powershell-webrequest`
- `python` (the default), `python-http`
- `r`, `r-httr2`
- `ruby`, `ruby-httparty`
- `rust`
- `swift`
- `wget`

`--verbose` enables printing of conversion warnings and error tracebacks.

### Usage as a library

The JavaScript API is a bunch of functions that can take either a string of Bash code or an array of already-parsed arguments (like [`process.argv`](https://nodejs.org/docs/latest/api/process.html#processargv)) and return a string with the resulting program:

```js
import * as curlconverter from 'curlconverter';

curlconverter.toPython('curl example.com');
curlconverter.toPython(['curl', 'example.com']);
// "import requests\n\nresponse = requests.get('http://example.com')\n"
```

**Note**: add `"type": "module",` to your package.json for the `import` statement above to work. curlconverter must be imported as an ES module with `import` this way and not with `require()` because it uses [top-level `await`](https://v8.dev/features/top-level-await).

There's a corresponding set of functions that also return an array of warnings if there are any issues with the conversion:

```js
curlconverter.toPythonWarn('curl ftp://example.com');
curlconverter.toPythonWarn(['curl', 'ftp://example.com']);
// [
//   "import requests\n\nresponse = requests.get('ftp://example.com')\n",
//   [ [ 'bad-scheme', 'Protocol "ftp" not supported' ] ]
// ]
```

In the browser it needs two [WASM](https://developer.mozilla.org/en-US/docs/WebAssembly) files, `tree-sitter.wasm` (from `web-tree-sitter`) and `tree-sitter-bash.wasm` (in this package's `dist/`). Serve both from one folder and load them once before converting:

```js
import { initCurlConverter, toJsonObject } from "@testsigmainc/ts-curlconverter";

await initCurlConverter({ wasmBaseUrl: "https://static.example.com/ts-curlconverter/1.0.1/" });
toJsonObject("curl -X POST https://example.com -d 'a=1'");
```

Converting before the load finishes throws. Calling `initCurlConverter` again reuses the first load. `wasmBaseUrl` may be a URL or a path on the page's origin, with or without a trailing `/`. If `tree-sitter.wasm` cannot be loaded, the promise rejects and later calls reject too until the page reloads, because `web-tree-sitter` keeps its first load. A Vite app that sets `VITE_TREE_SITTER_FILES_S3_URL` still loads on import, before its own code runs, without calling it.

Serve the `tree-sitter.wasm` of the `web-tree-sitter` version this package pins (0.24.3); the JavaScript loader and its wasm must come from the same build.

In Node the native `tree-sitter` and `tree-sitter-bash` packages are used instead. They are optional dependencies, installed by default; when they are missing, `initCurlConverter` rejects and converting throws. A bundler building for a server never needs them, since the Node build loads them at run time.

### Usage in VS Code

There's a VS Code extension that adds a "Paste cURL as \<language\>" option to the right-click menu: [https://marketplace.visualstudio.com/items?itemName=curlconverter.curlconverter](https://marketplace.visualstudio.com/items?itemName=curlconverter.curlconverter). It doesn't support the same languages, curl arguments or Bash syntax as the current version because it has to [use an old version of curlconverter](https://github.com/curlconverter/curlconverter-vscode/issues/1).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT © [Nick Carneiro](http://trillworks.com)
