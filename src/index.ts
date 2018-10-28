import * as Lerna from '@lerna/project';
import { cyanBright } from 'ansi-colors';
import { fromPairs } from 'lodash';
import { join, relative } from 'path';
import * as sliceAnsi from 'slice-ansi';
import * as split2 from 'split2';
import * as stripAnsi from 'strip-ansi';

export interface ILernaPackage {
  /* The absolute path to the root of the package. */
  location: string;
  /* The name of the package. */
  name: string;
  /* The absolute path to the root of the lerna project. */
  rootPath: string;
}

export interface ITransformerConfig {
  /* The working directory for the transformer. */
  cwd?: string;
  /* The regular expression to match tsc output paths with. */
  matcher?: RegExp;
  /* The string to prefix tsc output paths with. */
  prefix?: string;
  /* The function to transform the line with. */
  transform?: (opts: ILernaStreamTransform) => string;
}

export interface IStreamTransform {
  /* The line matched by the matcher. */
  line: string;
  /* The regular expression that matched the line. */
  matcher: RegExp;
  /* The line matched by the matcher with ANSI codes removed. */
  plain: string;
  /* The prefix to use. */
  prefix: string;
}

export interface ILernaStreamTransform extends IStreamTransform {
  /* A dictionary of lerna packages and locations. */
  packages: {
    [key: string]: string;
  };
}

// matches typescript compiler errors of the format:
// @monorepo/my-library: src/index-test.ts:9:6 - error TS2339: Property 'badProperty' does...
const lernaTscPattern = /(^@?[a-zA-Z_\/\.\-]+): [a-zA-Z_\/\.\-]+\.ts:\d+:\d+ - /;

const lernaTscTransform = ({ line, plain, matcher, prefix, packages }: ILernaStreamTransform) => {
  const [, packageName] = plain.match(matcher)!;
  const pathPrefix = prefix || packages[packageName];
  const colouredPackageName = sliceAnsi(line, 0, packageName.length);
  const colouredTscPath = sliceAnsi(line, `${packageName}: `.length);
  const prefixedPath = cyanBright(join(pathPrefix, colouredTscPath));

  return `${colouredPackageName}: ${prefixedPath}\n`;
};

export const getTransformer = async ({
  cwd = process.cwd(),
  matcher = lernaTscPattern,
  prefix = '',
  transform = lernaTscTransform,
}: ITransformerConfig = {}) => {
  const project = new Lerna(cwd);
  const projectPackages: ILernaPackage[] = await project.getPackages();

  // build a dictionary of name => location mappings at startup
  const packages = fromPairs(projectPackages.map(({ location, name, rootPath }) => [name, relative(rootPath, location)]));

  const prefixPathLine = (line: string) => {
    const plain = stripAnsi(line);

    // skip lines that are not tsc output paths
    if (!matcher.test(plain)) {
      return `${line}\n`;
    }

    return transform({
      line,
      matcher,
      packages,
      plain,
      prefix,
    });
  };

  return split2(prefixPathLine);
};
