# TypeScript Compiler Path Prefixer

[![CircleCI](https://circleci.com/gh/stemn/tsc-path-prefix/tree/master.svg?style=svg)](https://circleci.com/gh/stemn/tsc-path-prefix/tree/master)

Fix VS Code terminal links when using `lerna` by prefixing file paths in `tsc` output.

## Motivation

When building TypeScript packages in a monorepository using `lerna`, file paths in `tsc` output are relative to the package folder, not the root folder of the monorepository. This breaks VS Code's terminal hyperlink functionality.

This utility prefixes file paths in `tsc` output so they are relative to the root of the monorepository and recognized by VS Code.

## Install

```sh
yarn add --dev tsc-path-prefix
```

## Shell Usage

After invoking `tsc` in a package with `lerna --prefix`, pipe it through `tsc-path-prefix`. The `lerna` project configuration will be inspected and the `tsc` output path prefixed with the package path.

```sh
yarn lerna build:watch --parallel --prefix | tsc-path-prefix
```

You can use `tsc-path-prefix` independently of `lerna` by supplying a prefix as an argument on invocation:

```sh
yarn build:watch --parallel | tsc-path-prefix 'libraries/my-library'
```

## Gotchas

When piping to `tsc-path-prefix` from `lerna` the parent shell will have its `process.stdout.isTTY` set to `false` causing the underlying [`chalk`](https://github.com/chalk/chalk) library used by `lerna` not to output colours. Set the `FORCE_COLOUR` environment variable to force coloured output when piping to `tsc-path-prefix`.

```sh
FORCE_COLOR=1 yarn build:watch --parallel --prefix | tsc-path-prefix
```

Errors reported by `tsc` are sent to `stderr` and not piped downstream via `stdout`. To redirect `tsc` `stderr` to `stdout` you must invoke `lerna` with either `--paralell` or `--stream`, or use `tsc 2>&1 | tsc-path-prefix`.

## Monorepository Usage

Use `tsc-path-prefix` in your root `package.json` scripts:

```json
{
  "devDependencies": {
    "@stemn/tsc-path-prefix": "^0.0.1",
    "lerna": "^3.4.3"
  },
  "lerna": {
    "packages": [
      "libraries/*"
    ],
    "version": "3.4.3"
  },
  "name": "monorepo",
  "scripts": {
    "build:watch": "yarn lerna run build:watch --parallel | tsc-path-prefix"
  }
}
```

`libraries/my-library/package.json`

```json
{
  "name": "@monorepo/my-library",
  "devDependencies": {
    "typescript": "^3.1.3"
  },
  "scripts": {
    "build:watch": "tsc --watch"
  }
}
```

## Example

### Before

Lerna output will contain `tsc` paths relative to the root folder of the package.

```sh
@monorepo/my-library: [10:08:07 AM] Starting compilation in watch mode...
@monorepo/my-library: src/index.ts:9:6 - error TS2339: Property 'badProperty' does not exist on type 'ITestInterface'.
@monorepo/my-library: 9 test.badProperty = 'error';
@monorepo/my-library:        ~~~~~~~~~~~
@monorepo/my-library: [10:08:12 AM] Found 1 error. Watching for file changes.
```

### After

Lerna output will contain `tsc` paths relative to the root folder of the monorepository.

```sh
@monorepo/my-library: [10:08:07 AM] Starting compilation in watch mode...
@monorepo/my-library: libraries/my-library/src/index.ts:9:6 - error TS2339: Property 'badProperty' does not exist on type 'ITestInterface'.
@monorepo/my-library: 9 test.badProperty = 'error';
@monorepo/my-library:        ~~~~~~~~~~~
@monorepo/my-library: [10:08:12 AM] Found 1 error. Watching for file changes.
```

### Diff

```diff
$ tsc

-@monorepo/my-library: src/index.ts:9:6
+@monorepo/my-library: libraries/my-library/src/index.ts:9:6
```

## Testing

```sh
git clone git@github.com:stemn/tsc-path-prefix.git
cd tsc-path-prefix
yarn install
yarn test
```
