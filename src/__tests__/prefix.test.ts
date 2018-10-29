import { cyanBright } from 'ansi-colors';
import * as execa from 'execa';
import { copy, createReadStream, mkdirp } from 'fs-extra';
import * as streamToString from 'get-stream';
import { join } from 'path';
import * as pkgd from 'pkgd';

import { getTransformer } from '..';

// in ci logs are not printed by lerna
jest.mock('is-ci', () => false);

const monorepoFixturePath = join(__dirname, '__fixtures__/monorepo');

const monorepoFixture: execa.Options = {
  cwd: '/tmp/monorepo-test',
  env: <any> {
    FORCE_COLOR: 1,
  },
};

// a yarn command for executing inside the monorepo fixture
const yarn = (args: string[]) => execa('yarn', ['--silent', ...args], monorepoFixture);

beforeAll(async () => {
  const { cfg: packageJson } = await pkgd();

  // copy the monorepo fixture to the /tmp directory so that tests are run only
  // in the fixture monorepo, not in the fixture monorepo in the parent monorepo
  // this ensures only the fixture lerna.json is found in the recursive config search
  await mkdirp(monorepoFixture.cwd!);

  // exclude node_modules when copying monorepo fixture
  await copy(monorepoFixturePath, monorepoFixture.cwd!, {
    filter: (src) => !src.includes('node_modules'),
  });

  // prepare monorepo fixture by installing dependencies and linking this package
  await execa('yarn', ['install'], monorepoFixture);
  await execa('yarn', ['link'], { cwd: __dirname });
  await execa('yarn', ['unlink', packageJson.name], monorepoFixture);
  await execa('yarn', ['link', packageJson.name], monorepoFixture);
});

describe('Typescript compiler path prefixer', () => {

  it('can be used in a package.json script with yarn lerna run --prefix', async () => {

    // the `build` script in the monorepo package.json pipes to tsc-path-prefix
    const { stdout: lernaOutput } = yarn(['build']);
    const output = await streamToString(lernaOutput);

    expect(output).toMatchSnapshot();
  });

  it('can prefix tsc output wth a custom transformer', async () => {

    // matches typescript compiler errors without lerna package prefixes e.g.:
    // src/index-test.ts:9:6 - error TS2339: Property 'badProperty' does...
    const transform = await getTransformer({
      cwd: monorepoFixture.cwd,
      matcher: /^[a-zA-Z_\/\.]+\.ts:\d+:\d+ - /,
      prefix: 'libraries/my-library/',
      transform: ({ prefix, line }) => `${cyanBright(prefix)}${line}\n`,
    });

    const { stdout: tscOutput } = yarn(['lerna', 'run', 'build', '--stream', '--no-prefix']);
    const transformedOutputStream = tscOutput.pipe(transform);
    const output = await streamToString(transformedOutputStream);

    expect(output).toMatchSnapshot();
  });

  it('adds a custom prefix in output that has no lerna.json present', async () => {

    // matches typescript compiler errors without lerna package prefixes e.g.:
    // src/index-test.ts:9:6 - error TS2339: Property 'badProperty' does...
    const transform = await getTransformer({
      cwd: monorepoFixture.cwd,
      matcher: /^[a-zA-Z_\/\.]+\.ts:\d+:\d+ - /,
      prefix: 'custom/prefix/',
      transform: ({ prefix, line }) => `${cyanBright(prefix)}${line}\n`,
    });

    const tscOutput = createReadStream('src/__tests__/__fixtures__/bug-resolution/path-parsed-incorrectly.log');
    const transformedOutputStream = tscOutput.pipe(transform);
    const output = await streamToString(transformedOutputStream);

    expect(output).toMatchSnapshot();
  });

});
