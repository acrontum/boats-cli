import { access, writeFile, mkdir as fsmkdir, stat } from 'node:fs/promises';

export interface JsonArray extends Array<string | number | boolean | Json | JsonArray> {}
export interface Json {
  [x: string]: string | number | boolean | Json | JsonArray;
}

const endings: Record<string, string> = {
  ves: 'fe',
  ies: 'y',
  i: 'us',
  zes: 'ze',
  ses: 's',
  es: 'e',
  s: '',
};
const replacer = new RegExp(`(${Object.keys(endings).join('|')})$`);

export const description = Symbol('description');
export const argname = Symbol('argname');

export const singular = (word: string): string => word.replace(replacer, (end) => endings[end]);

export const capitalize = (s: string): string => `${s[0].toUpperCase()}${s.slice(1)}`;

// https://github.com/typeorm/typeorm/blob/master/src/util/StringUtils.ts
export const camelCase = (str: string, firstCapital: boolean = false): string => {
  return (firstCapital ? ' ' + str : str).replace(/^([A-Z])|[\s-_](\w)/g, (_, p1, p2) => p2?.toUpperCase() || p1.toLowerCase());
};

export const dashCase = (str: string): string => {
  return str
    .replace(/([A-Z])([A-Z])([a-z])/g, '$1-$2$3')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
};

export const exists = (path: string): Promise<boolean> =>
  access(path)
    .then(() => true)
    .catch(() => false);

export const mkdir = async (path: string): Promise<string> => fsmkdir(path, { recursive: true });

export const createFile = async (path: string, content: string, force = false): Promise<boolean> => {
  if (!force && (await exists(path))) {
    return false;
  }

  await writeFile(path, content);

  return true;
};

export const toYaml = (object: Json): string => {
  const out: string[] = [];
  toYamlRecurse(object, out, 0);

  return out.join('\n');
};

const toYamlRecurse = (object: Json | Json[string], out: string[], depth = 0, isArray = false): void => {
  const prevIndent = depth ? ' '.repeat((depth - 1) * 2) : '';

  if (typeof object === 'object' && object !== null) {
    const keys = Object.keys(object) as (keyof object)[];
    let first = true;
    for (const key of keys) {
      if (isArray && first) {
        out[out.length - 1] = `${prevIndent}- ${key}:`;
        first = false;
      } else {
        out.push(`${' '.repeat(depth * 2)}${key}:`);
      }
      toYamlRecurse(object[key], out, depth + 1, Array.isArray(object));
    }
    return;
  }

  if (typeof object === 'string') {
    object = `"${object.replace(/\"/g, '\\"')}"`;
  }

  if (isArray) {
    out[out.length - 1] = `${prevIndent}- ${object}`;
  } else {
    out[out.length - 1] += ` ${object}`;
  }
};
