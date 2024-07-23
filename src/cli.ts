#!/usr/bin/env node

import { parseArgs, ParseArgsConfig } from 'node:util';
import { generate, GenerationTask } from './generate';
import { getBoatsRc, getIndex } from './generators/scaffold';
import { argname, description } from './lib';
import { modelCliArguments, parseModelCommand } from './subcommands/model';
import { parsePathCommand, pathCliArguments } from './subcommands/path';

export type ParseArgsOptionConfig = NonNullable<ParseArgsConfig['options']>[string];
export type CliArg = ParseArgsOptionConfig & { [description]: string; [argname]?: string };
export type GlobalOptions = { 'dry-run'?: boolean; force?: boolean };
export type SubcommandGenerator = (args: string[], options?: GlobalOptions) => GenerationTask[];

const parseInitCommand: SubcommandGenerator = (args: string[]) => {
  if (args.find((arg) => arg === '-h' || arg === '--help')) {
    console.log('npx bc init creates a .boatsrc and src/index.yml files.');
    console.log('Both files are also created when other commands are run as they are necessary for boats build.');
    process.exit(1);
  }

  return [];
};

const subcommands: Record<string, SubcommandGenerator> = {
  path: parsePathCommand,
  model: parseModelCommand,
  init: parseInitCommand,
};

const cliArguments: Record<string, CliArg> = {
  'dry-run': { type: 'boolean', short: 'd', [description]: 'Print the changes to be made' },
  force: { type: 'boolean', short: 'f', [description]: 'Overwrite existing files' },
  help: { type: 'boolean', short: 'h', [description]: 'Show this menu' },
};

export const buildHelpFromOpts = (opts: Record<string, CliArg>): string => {
  let longest = 0;
  const longOpts = (Object.keys(opts) as (keyof typeof cliArguments)[]).sort();
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
  (exitCode === 0 ? console.log : console.error)(`${message ? message + '\n\n' : ''}\
\x1b[0;0mGenerates boilerplate boats files.

Usage:
  npx bc <subcommand> <name> [options]

Global options:
${buildHelpFromOpts(cliArguments)}
Use 'npx bc <subcommand> --help' for details about subcommands.

Subcommands:
  path PATH OPTION [options]
  model SINGULAR_NAME [options]

Examples:
  npx bc path users/:id --list --get --delete --patch --put

  npx bc \\
    path "users/{id}/media/{id}" --get --model videos \\
    model someCustomModel

  npx bc model user --list --get --delete --patch --put

  npx bc model users/:id --delete --patch --dry-run
`);

  if (typeof exitCode === 'number') {
    process.exit(exitCode);
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

    console.error(e);

    return null;
  }
};

const cli = async () => {
  const processed = parseCliArgs(
    {
      options: { ...modelCliArguments, ...pathCliArguments, ...cliArguments },
      tokens: true,
      allowPositionals: true,
      strict: false,
    },
    help,
  );

  if (!processed?.tokens?.length) {
    console.error('error: missing arguments\n');
    return help(1);
  }

  const globalOptions: GlobalOptions = {};
  const todo: string[][] = [];
  const subcommand: string[] = [];

  let done = false;
  let hasSubCommand = false;
  for (let i = 0; i < processed.tokens.length; ++i) {
    const arg = processed.tokens[i];
    switch (arg.kind) {
      case 'option':
        if (arg.name === 'help') {
          if (!hasSubCommand) {
            return help(0);
          } else {
            subcommand.push(arg.rawName);
          }
        }

        if (arg.name in cliArguments) {
          globalOptions[arg.name as keyof typeof globalOptions] = true;
          continue;
        }
        if (!subcommand.length) {
          console.error(`Unknown option '${arg.rawName}'.\n`);

          return help(1);
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
          console.error(`Unknown subcommand '${arg.value}'.\n`);

          return help(1);
        }
        subcommand.push(arg.value);
        break;
      case 'option-terminator':
        done = true;
        break;
    }
    if (done) {
      break;
    }
  }

  if (subcommand.length) {
    todo.push(subcommand);
  }

  const tasks: GenerationTask[] = [];
  for (const [subcommand, ...args] of todo) {
    tasks.push(...subcommands[subcommand](args, globalOptions));
  }
  tasks.push({ contents: getIndex, filename: 'src/index.yml' }, { contents: getBoatsRc, filename: '.boatsrc' });

  await generate(tasks, globalOptions);
};

if (require.main === module) {
  cli()
    .then(() => process.exit(0))
    .catch((e) => {
      console.trace(e);
      process.exit(1);
    });
}
