import { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getModel } from '../src/templates/model';
import { logger } from '../src';

export const toArgv = (text: string): string[] => text.trim().split(/\s+/);

export const getAllFiles = (path: string): Promise<string[]> =>
  readdir(path, { recursive: true, withFileTypes: true }).then((dirents: Dirent[]) => {
    const files: string[] = [];
    for (const dirent of dirents) {
      if (dirent.isFile()) {
        files.push(join(dirent.parentPath, dirent.name));
      }
    }

    return files.sort();
  });
export const baseModel = getModel();
export const getFile = (file: string): Promise<string> => readFile(file, { encoding: 'utf8' });

export const getLogger = (): (() => void) => {
  logger.console = {
    ...console,
    logs: [],
    clear(): void {
      if (this.logs?.length) {
        this.logs.length = 0;
      }
    },
    info(...args: unknown[]): void {
      this.logs ||= [];
      this.logs.push({ type: 'info', args });
    },
    log(...args: unknown[]): void {
      this.logs ||= [];
      this.logs.push({ type: 'log', args });
    },
    error(...args: unknown[]): void {
      this.logs ||= [];
      this.logs.push({ type: 'error', args });
    },
    warn(...args: unknown[]): void {
      this.logs ||= [];
      this.logs.push({ type: 'warn', args });
    },
  };

  return () => (logger.console = console);
};
