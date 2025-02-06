import { CliExit, GlobalOptions, SubcommandGenerator } from '../cli';
import { GenerationTask, logger } from '../generate';
import { getComponentIndex } from '../templates/model';
import { getPathIndex } from '../templates/path';

const initUsage = `\
Initialize BOATS project structure and files.
By default, creates a minimal project with .boatsrc and src/index.yml.
Note that the 'path' and 'model' subcommands also create these files as necessary by default.

Usage:
  npx bc init [-a]

Options:
  -a, --all  Also create schema, param, and path index files

Examples:
  Running:
    npx bc init

  Would create:
    .boatsrc
    src/index.yml

  Running:
    npx bc init -a

  Would create:
    .boatsrc
    src/components/parameters/index.yml
    src/components/schemas/index.yml
    src/index.yml
    src/paths/index.yml
`;

export const parseInitCommand: SubcommandGenerator = (args: string[], options: GlobalOptions) => {
  const tasks: GenerationTask[] = [];

  if (!args.length) {
    return tasks;
  }

  for (const arg of args) {
    switch (arg) {
      case '-h':
      case '--help':
        logger.console.info(initUsage);
        throw new CliExit(0);
      case '--all':
      case '-a':
        tasks.push(
          { contents: () => getComponentIndex(options['root-ref']), filename: 'src/components/schemas/index.yml' },
          { contents: () => getComponentIndex(''), filename: 'src/components/parameters/index.yml' },
          { contents: getPathIndex, filename: 'src/paths/index.yml' },
        );
        break;
      default:
        logger.console.error(`Unknown option '${arg}'.\n`);
        logger.console.error(initUsage);
        throw new CliExit(1);
    }
  }

  return tasks;
};
