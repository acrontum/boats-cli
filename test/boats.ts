import { default as template } from 'boats/build/src/Template';
import { default as bundlerSwaggerParse } from 'boats/build/src/bundlerSwaggerParse';
import { BoatsRC } from 'boats/build/src/interfaces/BoatsRc';
import { access, readFile } from 'fs/promises';
import { dirname } from 'path';
import pj from '../package.json';
import { getBoatsRc } from '../src/templates/init';

export type ErrorWithLogs = Error & { code: string; logs: unknown[] };

type ConsoleMock = {
  logs: unknown[];
  original: Record<'log' | 'error' | 'warn' | 'info', typeof console.log>;
  unmock: () => void;
};

const mockConsoleLog = (): ConsoleMock => {
  /* eslint-disable no-console */
  const olog = console.log;
  const oerror = console.error;
  const owarn = console.warn;
  const oinfo = console.info;
  const logs: unknown[] = [];
  const log = (...args: unknown[]): number => logs.push(args);
  console.log = log;
  console.error = log;
  console.warn = log;
  console.info = log;

  return {
    logs,
    original: {
      log: olog,
      error: oerror,
      warn: owarn,
      info: oinfo,
    },
    unmock(): void {
      console.log = olog;
      console.error = oerror;
      console.warn = owarn;
      console.info = oinfo;
    },
  };
  /* eslint-enable no-console */
};

let overridden = false;
// force package json helper to return 1.0.0 for 'version'
const overridePackageJsonReader = (): void => {
  if (overridden) {
    return;
  }
  overridden = true;

  const original = template.setupDefaultNunjucksEnv.bind(template);
  template.setupDefaultNunjucksEnv = (): ReturnType<typeof template.setupDefaultNunjucksEnv> => {
    const env = original();

    env.addGlobal('packageJson', (value: string): unknown => {
      if (value === 'version') {
        return '1.0.0';
      }
      return pj[value as keyof typeof pj] || '';
    });

    return env;
  };
};

const defaultBoatsRc = JSON.parse(getBoatsRc()) as BoatsRC;

export const boats = async (inFile: string, outFile: string, validate = true): Promise<string> => {
  const trim = dirname(inFile) + '/paths/';
  const customBoatsRcPath = dirname(dirname(inFile)) + '/.boatsrc';
  let boatsRc = defaultBoatsRc;
  try {
    const hasBoatsRc = await access(customBoatsRcPath)
      .then(() => true)
      .catch(() => false);
    if (hasBoatsRc) {
      boatsRc = JSON.parse(await readFile(customBoatsRcPath, { encoding: 'utf8' })) as BoatsRC;
    }
  } catch (_e: unknown) {}

  overridePackageJsonReader();
  // overwrite console during testing - no debug output needed
  const con = mockConsoleLog();

  try {
    const indexFile = template.directoryParse(inFile, outFile, null as unknown as number, trim, [], [], boatsRc, false);
    const outApiFile = await bundlerSwaggerParse({
      inputFile: indexFile,
      outputFile: outFile,
      boatsRc,
      dereference: false,
      doNotValidate: !validate,
      excludeVersion: false,
      indentation: 2,
    });

    con.unmock();

    return outApiFile;
  } catch (error: unknown) {
    con.unmock();

    (error as ErrorWithLogs).logs = con.logs;

    return Promise.reject(error as Error);
  }
};
