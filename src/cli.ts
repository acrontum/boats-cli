#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import { relative } from 'node:path';
import { parseArgs, ParseArgsConfig } from 'node:util';
import { generate, GenerationTask, logger } from './generate';
import { argname, description } from './lib';
import { parseInitCommand } from './subcommands/init';
import { modelCliArguments, parseModelCommand } from './subcommands/model';
import { parsePathCommand, pathCliArguments } from './subcommands/path';
import { getBoatsRc, getIndex } from './templates/init';

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
};
export type SubcommandGenerator = (args: string[], options: GlobalOptions) => GenerationTask[] | null;

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

export const cliArguments: Record<string, CliArg> = {
  'dry-run': { type: 'boolean', short: 'D', [description]: 'Print the changes to be made' },
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
          if (arg.name === 'output' || arg.name === 'root-ref') {
            if (!arg.value) {
              help(1, `Parameter '--${arg.name}' requires a value`);

              return {};
            }
            globalOptions[arg.name] = arg.value;
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
    tasks.push({ contents: () => getIndex(globalOptions), filename: 'src/index.yml' }, { contents: getBoatsRc, filename: '.boatsrc' });
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
