import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dirname } from 'path';
import { GlobalOptions } from './cli';
import { createFile, exists, mkdir } from './lib';
import { getComponentIndex } from './templates/model';
import { getPathIndex } from './templates/path';

export interface GenerationTask {
  contents: () => string;
  filename: string;
  generate?: boolean;
  undo?: () => Promise<void>;
}

export const logger = { console: console as Console & { logs?: unknown[]; clear?: () => void } };

const logCreate = '\x1b[32m[create]\x1b[0m ';
const logExists = '\x1b[33m[exists]\x1b[0m ';
const logOverwrite = '\x1b[31m[replace]\x1b[0m';

const runTask = async (task: GenerationTask, options: GlobalOptions = {}): Promise<GenerationTask> => {
  const { contents, filename } = task;
  const fileExists = await exists(filename);
  const prefix = fileExists ? (options.force ? logOverwrite : logExists) : logCreate;

  if (!options.quiet) {
    logger.console.info(prefix, filename);
  }

  if (options.verbose) {
    logger.console.info(`${contents()}\n`);
  }

  if (!options['dry-run']) {
    const createdFolder = await mkdir(dirname(filename));

    if (!fileExists) {
      task.undo = async (): Promise<void> => {
        await rm(createdFolder || filename, { recursive: true, force: true }).catch(() => null as unknown);
        logger.console.warn('cleaned up', createdFolder ? createdFolder + '/' : filename);
      };
    } else if (options.force) {
      const previousContents = await readFile(filename, { encoding: 'utf8' });
      task.undo = async (): Promise<void> => {
        await writeFile(filename, previousContents, { encoding: 'utf8' }).catch(() => null as unknown);
        logger.console.warn('reverted changes in', filename);
      };
    }

    await createFile(filename, contents(), options.force);
  }

  return task;
};

export const generate = async (tasks: GenerationTask[], options: GlobalOptions = {}): Promise<Record<string, GenerationTask>> => {
  const mapped: { [k in string]?: GenerationTask } = {};
  const output = options.output || '';
  let filenames: string[] = [];

  try {
    for (const task of tasks) {
      task.filename = join(output, task.filename);
      if (task.generate === false) {
        continue;
      }
      mapped[task.filename] = task;

      if (!options['no-index']) {
        if (task.filename.indexOf('src/components/schemas/') !== -1) {
          const filename = join(output, 'src/components/schemas/index.yml');
          mapped[filename] ||= { contents: (): string => getComponentIndex(), filename };
        } else if (task.filename.indexOf('src/components/parameters/') !== -1) {
          const filename = join(output, 'src/components/parameters/index.yml');
          mapped[filename] ||= { contents: (): string => getComponentIndex(''), filename };
        } else if (task.filename.indexOf('src/paths/') !== -1) {
          const filename = join(output, 'src/paths/index.yml');
          mapped[filename] ||= { contents: (): string => getPathIndex(), filename };
        }
      }
    }

    const generationTasks: Promise<GenerationTask>[] = [];
    filenames = Object.keys(mapped).sort();
    for (const filename of filenames) {
      const task = mapped[filename];
      if (task) {
        generationTasks.push(runTask(task, options));
      }
    }

    await Promise.all(generationTasks);
    if (options['dry-run'] && !options.quiet) {
      logger.console.info('- no files were harmed in the running of this command (dry-run) -');
    }
  } catch (e: unknown) {
    logger.console.error(e);

    const cleanupTasks: Promise<void>[] = [];
    for (const filename of filenames) {
      const task = mapped[filename] as GenerationTask;
      if (typeof task.undo === 'function') {
        cleanupTasks.push(
          task.undo().catch((e: unknown) => {
            logger.console.warn(e);
          }),
        );
      }
    }

    await Promise.all(cleanupTasks);
  }

  return mapped as Record<string, GenerationTask>;
};
