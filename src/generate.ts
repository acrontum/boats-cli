import { rm } from 'node:fs/promises';
import { dirname } from 'path';
import { GlobalOptions } from './cli';
import { getPathIndex } from './generators/method';
import { getComponentIndex } from './generators/model';
import { createFile, exists, mkdir } from './lib';

export interface GenerationTask {
  contents: () => string;
  filename: string;
  generate?: boolean;
  undo?: () => Promise<void>;
}

const logCreate = '\x1b[32m[create]\x1b[0m ';
const logExists = '\x1b[33m[exists]\x1b[0m ';
const logOverwrite = '\x1b[31m[replace]\x1b[0m';

const runTask = async (task: GenerationTask, options: GlobalOptions = {}): Promise<void> => {
  const dryRun = options['dry-run'];
  const force = options.force;

  const { filename, contents } = task;
  const fileExists = await exists(filename);
  const prefix = fileExists ? (force ? logOverwrite : logExists) : logCreate;

  console.log(prefix, filename);

  if (!dryRun) {
    const createdFolder = await mkdir(dirname(filename));

    if (!fileExists) {
      task.undo = async (): Promise<void> => {
        await rm(createdFolder || filename, { recursive: true, force: true }).catch(() => null);
        console.warn('cleaned up', createdFolder ? createdFolder + '/' : filename);
      };
    }

    await createFile(filename, contents(), force);
  } else if (process.env.VERBOSE) {
    console.warn(`${contents()}\n\n`);
  }
};

export const generate = async (tasks: GenerationTask[], options: GlobalOptions = {}): Promise<GenerationTask[]> => {
  const mapped: Record<string, GenerationTask> = {};
  const promises: Promise<void>[] = [];
  let filenames: string[];

  try {
    for (const task of tasks) {
      if (task.generate === false) {
        continue;
      }
      mapped[task.filename] = task;
      if (task.filename.indexOf('src/components/schemas/') !== -1) {
        mapped['src/components/schemas/index.yml'] ||= { contents: () => getComponentIndex(), filename: 'src/components/schemas/index.yml' };
      } else if (task.filename.indexOf('src/components/parameters/') !== -1) {
        mapped['src/components/parameters/index.yml'] ||= { contents: () => getComponentIndex(''), filename: 'src/components/parameters/index.yml' };
      } else if (task.filename.indexOf('src/paths/') !== -1) {
        mapped['src/paths/index.yml'] ||= { contents: () => getPathIndex(), filename: 'src/paths/index.yml' };
      }
    }

    filenames = Object.keys(mapped).sort();
    for (const filename of filenames) {
      promises.push(runTask(mapped[filename], options));
    }

    await Promise.all(promises);
    if (options?.['dry-run']) {
      console.log('- no files were harmed in the running of this command (dry-run) -');
    }
  } catch (e) {
    console.error(e);
    promises.length = 0;
    for (const filename of filenames) {
      if (typeof mapped[filename].undo === 'function') {
        promises.push(mapped[filename].undo().catch((e) => console.warn(e)));
      }
    }

    await Promise.all(promises);
  }

  return Object.values(mapped);
};
