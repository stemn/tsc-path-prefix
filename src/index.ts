import * as Lerna from '@lerna/project';
import { cyanBright } from 'ansi-colors';
import { fromPairs, get } from 'lodash';
import { join, relative } from 'path';
import { cwd } from 'process';
import * as sliceAnsi from 'slice-ansi';
import * as split2 from 'split2';
import * as stripAnsi from 'strip-ansi';

import { ILernaPackage, IRepositoryPackages, IStreamTransform, ITransformerConfig } from './types';

let repositoryPackages: IRepositoryPackages;

const tscConfig: ITransformerConfig = {
  cwd: cwd(),
  /*
    matches typescript compiler errors without lerna package prefix e.g.:
    src/index-test.ts:9:6 - error TS2339: Property 'badProperty' does...
  */
  matcher: /^[a-zA-Z_\/\.]+\.ts:\d+:\d+ - /,
  transform: ({ line, prefix, packages, transformer }: IStreamTransform) => {
    // if we're running in a lerna environment but output hasn't been lerna --prefix'd
    if (packages) {
      const [, paths] = Object.entries(packages).find(([,{ absolute }]) => absolute === transformer.cwd)!;
      return cyanBright(`${paths.relative}/${line}\n`);
    } else {
      return `${cyanBright(prefix)}${line}\n`;
    }
  },
};

const lernaTscConfig: ITransformerConfig = {
  cwd: cwd(),
  /*
    matches typescript compiler errors with lerna package prefix e.g.:
    @monorepo/my-library: src/index-test.ts:9:6 - error TS2339: Property 'badProperty' does...
  */
  matcher: /(^@?[a-zA-Z_\/\.\-]+): [a-zA-Z_\/\.\-]+\.ts:\d+:\d+ - /,
  transform: ({ line, plain, prefix, packages, transformer }: IStreamTransform) => {
    const [, packageName] = plain.match(transformer.matcher)!;
    const pathPrefix = prefix || packages![packageName].relative;
    const colouredLernaPackageName = sliceAnsi(line, 0, packageName.length);
    const colouredTscPath = sliceAnsi(line, `${packageName}: `.length, line.length);
    const prefixedPath = cyanBright(join(pathPrefix, colouredTscPath));

    return `${colouredLernaPackageName}: ${prefixedPath}\n`;
  },
};

const prefixPathLine = (transformers: ITransformerConfig[]) => (line: string) => {
  const plain = stripAnsi(line);
  const matchedTransformer = transformers.find(({ matcher }) => matcher.test(plain));

  // skip lines that are not matched tsc output paths
  if (!matchedTransformer) {
    return `${line}\n`;
  }

  const { prefix = '', transform } = matchedTransformer;

  return transform({
    line,
    packages: repositoryPackages,
    plain,
    prefix,
    transformer: matchedTransformer,
  });
};

export const getTransformer = async (config: ITransformerConfig) => {
  // if we were given a matcher, use it, otherwise use the default matchers
  const transformers: ITransformerConfig[] = config
    ? [config]
    : [lernaTscConfig, tscConfig];

  const transformer = prefixPathLine(transformers);

  const lernaRoot = get(config, 'cwd', cwd());
  const lernaProject = new Lerna(lernaRoot);
  const lernaPackages: ILernaPackage[] = await lernaProject.getPackages();

  // build a dictionary of package name => location mappings at startup
  repositoryPackages = fromPairs(lernaPackages.map(({ location: absolute, name, rootPath }) => [
    name,
    {
      absolute,
      relative: relative(rootPath, absolute),
    },
  ]));

  return split2(transformer);
};
