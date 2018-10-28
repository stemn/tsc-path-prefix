#!/usr/bin/env node

const { getTransformer } = require('..');

const {
  argv: [,, pathPrefixArg],
  stdin: parentStdout,
  stdout,
} = process;

getTransformer(pathPrefixArg)
  .then((tscPathTransformer) => parentStdout
    .pipe(tscPathTransformer)
    .pipe(stdout));
