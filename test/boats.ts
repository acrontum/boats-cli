import { default as template } from 'boats/build/src/Template';
import { default as bundlerSwaggerParse } from 'boats/build/src/bundlerSwaggerParse';
import { BoatsRC } from 'boats/build/src/interfaces/BoatsRc';
import { dirname } from 'path';

export type ErrorWithLogs = Error & { code: string; logs: unknown[] };

type ConsoleMock = {
  logs: unknown[];
  original: Record<'log' | 'error' | 'warn' | 'info', typeof console.log>;
  unmock: () => void;
};

export const defaultBoats: BoatsRC = {
  nunjucksOptions: { tags: {} },
  picomatchOptions: { bash: true },
  permissionConfig: { globalPrefix: true },
  paths: {},
  fancyPluralization: true,
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

export const boats = async (inFile: string, outFile: string, validate = true): Promise<string> => {
  const trim = dirname(inFile) + '/paths/';
  // overwrite console during testing - no debug output needed
  const con = mockConsoleLog();

  try {
    const indexFile = template.directoryParse(inFile, outFile, null as unknown as number, trim, [], [], defaultBoats, false);
    const outApiFile = await bundlerSwaggerParse({
      inputFile: indexFile,
      outputFile: outFile,
      boatsRc: defaultBoats,
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
