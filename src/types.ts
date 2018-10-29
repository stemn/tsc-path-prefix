export interface ILernaPackage {
  /* The absolute path to the root of the package. */
  location: string;
  /* The name of the package. */
  name: string;
  /* The absolute path to the root of the lerna project. */
  rootPath: string;
}

export interface IPackagePaths {
  /* The absolute path of the package. */
  absolute: string;
  /* The path of the package relative to the root of the monorepo. */
  relative: string;
}

export interface IRepositoryPackages {
  /* A dictionary of package paths indexed by package name. */
  [packageName: string]: IPackagePaths;
}

export interface ITransformerConfig {
  /* The working directory for the transformer. */
  cwd?: string;
  /* The regular expression to match tsc output paths with. */
  matcher: RegExp;
  /* The string to prefix tsc output paths with. */
  prefix?: string;
  /* The function to transform the line with. */
  transform: (opts: IStreamTransform) => string;
}

export interface IStreamTransform {
  /* The line matched by the matcher. */
  line: string;
  /* A dictionary of packages in the repository. */
  packages?: IRepositoryPackages;
  /* The line matched by the matcher with ANSI codes removed. */
  plain: string;
  /* The prefix to use. */
  prefix: string;
  /* The transformer for the matched line. */
  transformer: ITransformerConfig;
}
