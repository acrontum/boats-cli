#!/usr/bin/env node

import { mkdir, access, stat, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { parseArgs, ParseArgsConfig } from 'node:util';
import { generate, GenerationTask, logger } from './generate';
import { argname, description } from './lib';
import { parseInitCommand } from './subcommands/init';
import { modelCliArguments, parseModelCommand } from './subcommands/model';
import { parsePathCommand, pathCliArguments } from './subcommands/path';
import { getBoatsRc, getIndex } from './templates/init';
import { getComponentIndex, getModel, getModels, getPaginationModel, getParam } from './templates/model';
import { getCreate, getDelete, getList, getPathIndex, getReplace, getShow, getUpdate } from './templates/path';

export type ParseArgsOptionConfig = NonNullable<ParseArgsConfig['options']>[string];
export type CliArg = ParseArgsOptionConfig & { [description]: string; [argname]?: string };
export type GlobalOptions = {
  'dry-run'?: boolean;
  force?: boolean;
  'no-index'?: boolean;
  'no-init'?: boolean;
  'no-quote'?: boolean;
  output?: string;
  quiet?: boolean;
  verbose?: boolean;
  'root-ref'?: string;
  customTemplates?: {
    getBoatsRc?: typeof getBoatsRc;
    getIndex?: typeof getIndex;

    getComponentIndex?: typeof getComponentIndex;
    getModel?: typeof getModel;
    getModels?: typeof getModels;
    getParam?: typeof getParam;
    getPaginationModel?: typeof getPaginationModel;

    getPathIndex?: typeof getPathIndex;
    getList?: typeof getList;
    getCreate?: typeof getCreate;
    getShow?: typeof getShow;
    getDelete?: typeof getDelete;
    getUpdate?: typeof getUpdate;
    getReplace?: typeof getReplace;
  };
};
export type SubcommandGenerator = (args: string[], options: GlobalOptions) => GenerationTask[] | null;
export type CustomTemplates = Exclude<GlobalOptions['customTemplates'], undefined>;

/**
 * Custom error to immediately exit on errors.
 * Will trigger process.exit when called from the CLI, but can be
 * tested for when running programmatically.
 */
export class CliExit extends Error {
  code: number = 0;

  constructor(code: number) {
    super();
    this.code = code;
  }
}

const subcommands: Record<string, SubcommandGenerator> = {
  path: parsePathCommand,
  model: parseModelCommand,
  init: parseInitCommand,
};

const templateFileMapping = {
  'boats-rc.js': 'getBoatsRc',
  'component-index.js': 'getComponentIndex',
  'create.js': 'getCreate',
  'delete.js': 'getDelete',
  'index.js': 'getIndex',
  'list.js': 'getList',
  'model.js': 'getModel',
  'models.js': 'getModels',
  'pagination-model.js': 'getPaginationModel',
  'param.js': 'getParam',
  'path-index.js': 'getPathIndex',
  'replace.js': 'getReplace',
  'show.js': 'getShow',
  'update.js': 'getUpdate',
} as const satisfies Record<string, keyof Exclude<GlobalOptions['customTemplates'], undefined>>;

export const cliArguments: Record<string, CliArg> = {
  /*
  -t --templates
  create.js  delete.js  list.js  model.js  models.js  pagination.js  param.js  replace.js  show.js  update.js
  */
  'dry-run': { type: 'boolean', short: 'D', [description]: 'Print the changes to be made' },
  templates: {
    type: 'string',
    short: 'T',
    [argname]: 'TEMPLATES',
    [description]: 'Folder or module containing template overrides (can be invoked multiple times)',
  },
  force: { type: 'boolean', short: 'f', [description]: 'Overwrite existing files' },
  'no-index': { type: 'boolean', short: 'I', [description]: 'Skip auto-creating index files, only models' },
  'no-init': { type: 'boolean', short: 'N', [description]: 'Skip auto-creating init files' },
  'no-quote': {
    type: 'boolean',
    short: 'Q',
    [description]:
      'Remove quotes around string values. Note that this is not guaranteed to output a valid value as YAML string rules are non-trivial, so use at your own discretion.',
  },
  output: { type: 'string', short: 'o', [argname]: 'OUTPUT_DIR', [description]: 'Location to output files to (defaults to current folder)' },
  quiet: { type: 'boolean', short: 'q', [description]: 'Only output errors' },
  verbose: { type: 'boolean', short: 'v', [description]: 'Print the contents of the files to be generated' },
  'root-ref': {
    type: 'string',
    short: 'R',
    [argname]: 'TRIM',
    [description]:
      'Use root ref (#/) in schema refs instead of relative paths. ' +
      "TRIM should match autoComponentIndexer (usually 'Model'). " +
      "If TRIM is '-' then '' is passed to indexer",
  },
  help: { type: 'boolean', short: 'h', [description]: 'Show this menu' },
};

export const buildHelpFromOpts = (opts: Record<string, CliArg>): string => {
  let longest = 0;
  const longOpts = Object.keys(opts).sort();
  const options: string[][] = [];

  for (const longOpt of longOpts) {
    let opt = opts[longOpt].short ? [`-${opts[longOpt].short}`, `--${longOpt}`].join(', ') : `--${longOpt}`;
    if (opts[longOpt][argname]) {
      opt += ` ${opts[longOpt][argname]}`;
    }
    longest = Math.max(longest, opt.length);
    const usage = [opt, opts[longOpt][description]].filter(Boolean);

    if (longOpt !== 'help') {
      options.push(usage);
    }
  }
  options.push([`-h, --help`, opts.help[description]]);

  let text = '';
  for (const [key, desc, def] of options) {
    text += `  ${key.padEnd(longest)}  ${desc} ${def || ''}\n`;
  }

  return text;
};

const help = (exitCode: number | null = null, message?: string): null => {
  (exitCode === 0 ? logger.console.log.bind(logger.console) : logger.console.error.bind(logger.console))(`${message ? message + '\n\n' : ''}\
Generates boilerplate BOATS files.

Usage:
  npx bc SUBCOMMAND [OPTIONS] [...SUBCOMMAND [OPTIONS]]

Global options:
${buildHelpFromOpts(cliArguments)}
Use 'npx bc SUBCOMMAND --help' for details about subcommands.

Subcommands:
  path PATH METHOD_OPTION [...OPTIONS]
  model SINGULAR_NAME [...OPTIONS]
  init [-a]

If templates are used (-T, --templates), the following filenames / exports are used (files when path is a folder, export function name if is a module):
  - ${Object.entries(templateFileMapping)
    .map(([file, fn]) => `${file.padEnd(19, ' ')} - ${fn}`)
    .join('\n  - ')}

Examples:
  npx bc path users/:id --list --get --delete --patch --put

  npx bc \\
    path "users/{id}/media/{id}" --get --model videos \\
    model someCustomModel

  npx bc model user --list --get --delete --patch --put

  npx bc model users/:id --delete --patch --dry-run
`);

  if (typeof exitCode === 'number') {
    throw new CliExit(exitCode);
  }

  return null;
};

export const parseCliArgs = (
  config: ParseArgsConfig,
  help: (exitCode: number | null, message?: string) => null,
): (ReturnType<typeof parseArgs> & { values: Partial<Record<keyof typeof config, string>> }) | null => {
  try {
    return parseArgs(config);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    const message = (e as NodeJS.ErrnoException).message;

    if (code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE' || code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      return help(1, message);
    }

    logger.console.error(e);

    return null;
  }
};

const tryRequire = (path: string): GlobalOptions['customTemplates'] | null => {
  const overrides: Exclude<GlobalOptions['customTemplates'], undefined> = {};
  let lib: Exclude<GlobalOptions['customTemplates'], undefined> | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require(path) as Exclude<GlobalOptions['customTemplates'], undefined>;
  } catch (_) {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require(resolve(path)) as Exclude<GlobalOptions['customTemplates'], undefined>;
  } catch (_) {}

  if (lib) {
    overrides.getBoatsRc = lib.getBoatsRc;
    overrides.getIndex = lib.getIndex;
    overrides.getComponentIndex = lib.getComponentIndex;
    overrides.getModel = lib.getModel;
    overrides.getModels = lib.getModels;
    overrides.getParam = lib.getParam;
    overrides.getPaginationModel = lib.getPaginationModel;
    overrides.getPathIndex = lib.getPathIndex;
    overrides.getList = lib.getList;
    overrides.getCreate = lib.getCreate;
    overrides.getShow = lib.getShow;
    overrides.getDelete = lib.getDelete;
    overrides.getUpdate = lib.getUpdate;
    overrides.getReplace = lib.getReplace;

    if (!Object.values(overrides).find((v) => typeof v !== 'undefined')) {
      logger.console.error(`cannot load templates "${path}": module has no override exports\n`);

      return help(1);
    }

    return overrides;
  }

  logger.console.error(`cannot load templates "${path}": not a module\n`);

  return help(1);
};

const getTemplates = async (path: string): Promise<GlobalOptions['customTemplates'] | null> => {
  const overrides: Exclude<GlobalOptions['customTemplates'], undefined> = {};
  const fullPath = resolve(path);

  const accessible = await access(fullPath)
    .then(() => true)
    .catch(() => false);
  if (!accessible) {
    return tryRequire(path);
  }

  const folder = await stat(fullPath).catch(() => null);
  if (folder === null) {
    return tryRequire(path);
  }

  if (!folder.isDirectory()) {
    return tryRequire(path);
  }

  const files = await readdir(fullPath).catch(() => null);
  if (files === null) {
    logger.console.error(`cannot load templates "${path}": could not read template folder contents\n`);

    return help(1);
  }

  const matchingFiles = files.filter((file) => file in templateFileMapping) as (keyof typeof templateFileMapping)[];
  if (matchingFiles.length === 0) {
    logger.console.error(`cannot load templates "${path}": template folder has no override files\n`);

    return help(1);
  }

  for (const file of matchingFiles) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    overrides[templateFileMapping[file]] = require(join(fullPath, file));
  }

  return overrides;
};

export const cli = async (args: string[]): Promise<Record<string, GenerationTask>> => {
  const processed = parseCliArgs(
    {
      options: { ...modelCliArguments, ...pathCliArguments, ...cliArguments },
      tokens: true,
      allowPositionals: true,
      strict: false,
      args,
    },
    help,
  );

  if (!processed?.tokens?.length) {
    logger.console.error('error: missing arguments\n');

    help(1);

    return {};
  }

  const globalOptions: GlobalOptions = {};
  const todo: string[][] = [];
  const subcommand: string[] = [];
  let processTemplates: string | null = null;

  let done = false;
  let hasSubCommand = false;
  for (let i = 0; i < processed.tokens.length && !done; ++i) {
    const arg = processed.tokens[i];
    switch (arg.kind) {
      case 'option':
        if (arg.name === 'help') {
          if (!hasSubCommand) {
            help(0);

            return {};
          } else {
            subcommand.push(arg.rawName);
          }
        }

        if (arg.name in cliArguments) {
          if (arg.name === 'templates') {
            if (!arg.value) {
              help(1, `Parameter '--${arg.name}' requires a value`);

              return {};
            }

            processTemplates = arg.inlineValue ? arg.value.slice(1) : arg.value;
            const templates = await getTemplates(processTemplates);
            if (templates === null) {
              return {};
            }
            globalOptions.customTemplates = { ...globalOptions.customTemplates, ...templates };
          } else if (arg.name === 'output' || arg.name === 'root-ref') {
            if (!arg.value) {
              help(1, `Parameter '--${arg.name}' requires a value`);

              return {};
            }
            globalOptions[arg.name] = arg.value;
          } else if (arg.value) {
            help(1, `Parameter '--${arg.name}' is not expecting a value`);

            return {};
          } else {
            globalOptions[arg.name as Exclude<keyof typeof globalOptions, 'output' | 'root-ref'>] = true;
          }

          if (arg.name === 'verbose') {
            globalOptions.quiet = false;
          } else if (arg.name === 'quiet') {
            globalOptions.verbose = false;
          }
          continue;
        }
        if (!subcommand.length) {
          logger.console.error(`Unknown option '${arg.rawName}'.\n`);
          help(1);

          return {};
        }

        subcommand.push(arg.rawName);
        if (typeof arg.value !== 'undefined') {
          subcommand.push(arg.value);
        }
        break;
      case 'positional':
        if (arg.value in subcommands) {
          hasSubCommand = true;
          if (subcommand.length) {
            todo.push(subcommand.slice());
          }
          subcommand.length = 0;
        } else if (!subcommand.length) {
          logger.console.error(`Unknown subcommand '${arg.value}'.\n`);
          help(1);

          return {};
        }
        subcommand.push(arg.value);
        break;
      case 'option-terminator':
        done = true;
        break;
    }
  }

  if (process.env.VERBOSE) {
    globalOptions.verbose = true;
    globalOptions.quiet = false;
  }

  if (subcommand.length) {
    todo.push(subcommand);
  }

  const tasks: GenerationTask[] = [];
  for (const [subcommand, ...args] of todo) {
    const subcommandTasks = subcommands[subcommand](args, globalOptions);
    if (subcommandTasks?.length) {
      tasks.push(...subcommandTasks);
    }
  }

  if (globalOptions.output && globalOptions.output[0] !== '/') {
    globalOptions.output = relative('.', globalOptions.output);
  }

  if (!globalOptions['no-init']) {
    tasks.push(
      { contents: () => getIndex(globalOptions, 'src/index.yml'), filename: 'src/index.yml' },
      { contents: () => getBoatsRc(globalOptions, '.boatsrc'), filename: '.boatsrc' },
    );
  }

  if (!tasks.length) {
    help(1, 'Nothing to do');

    return {};
  }

  if (globalOptions.output && !globalOptions['dry-run']) {
    try {
      await mkdir(globalOptions.output, { recursive: true });
    } catch (e) {
      let message = `Invalid '--output' path.`;
      if (e instanceof Error) {
        message += ` ${e.message}`;
      }

      help(1, message);

      return {};
    }
  }

  // if custom templates - find all and import

  return await generate(tasks, globalOptions);
};

if (require.main === module) {
  cli(process.argv.slice(2))
    .then(() => process.exit(0))
    .catch((e: unknown) => {
      if (e instanceof CliExit) {
        process.exit(e.code);
      }
      logger.console.trace(e);
      process.exit(1);
    });
}
