import { access, mkdir as fsmkdir, writeFile } from 'node:fs/promises';

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface JsonArray extends Array<string | number | boolean | Json | JsonArray | null> {}
export interface Json {
  [x: string]: string | number | boolean | Json | JsonArray | null;
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
  return (firstCapital ? ' ' + str : str).replace(/^([A-Z])|[\s-_](\w)/g, (_, p1: string, p2?: string) => p2?.toUpperCase() || p1.toLowerCase());
};

export const dashCase = (str: string): string => {
  return str
    .replace(/([A-Z])([A-Z])([a-z])/g, '$1-$2$3')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/ +/g, '-')
    .toLowerCase();
};

export const exists = (path: string): Promise<boolean> =>
  access(path)
    .then(() => true)
    .catch(() => false);

export const mkdir = async (path: string): Promise<string | undefined> => fsmkdir(path, { recursive: true });

export const createFile = async (path: string, content: string, force = false): Promise<boolean> => {
  if (!force && (await exists(path))) {
    return false;
  }

  await writeFile(path, content);

  return true;
};

export const toYaml = (object: Json, trailingNewline = true): string => {
  const out: string[] = [];
  toYamlRecurse(object, out, 0);

  if (trailingNewline) {
    out.push('');
  }

  return out.join('\n');
};

const toYamlRecurse = (object: Json | Json[string], out: string[], depth = 0, isArray = false): void => {
  const prevIndent = depth ? ' '.repeat((depth - 1) * 2) : '';

  if (typeof object === 'object' && object !== null) {
    const keys = Object.keys(object);
    let first = true;
    for (const key of keys) {
      if (isArray && first) {
        out[out.length - 1] = `${prevIndent}- ${key}:`;
        first = false;
      } else {
        out.push(`${' '.repeat(depth * 2)}${key}:`);
      }
      toYamlRecurse((object as Json)[key], out, depth + 1, Array.isArray(object));
    }
    return;
  }

  if (typeof object === 'string') {
    object = `"${object.replace(/\"/g, '\\"')}"`;
  }

  if (isArray) {
    out[out.length - 1] = `${prevIndent}- ${object as string}`;
  } else {
    out[out.length - 1] += ` ${object as string}`;
  }
};

/**
 * trim leading index from inline template string
 *
 * example
 *  console.log(`\
 *    insert into auth.users
 *      (id, name)
 *    values
 *      (123, pat)`);
 *
 * would log
 * |  insert into auth.users
 * |    (id, name)
 * |  values
 * |    (pat, rules)"
 *
 * whereas
 *  const sql = trimIndent`\
 *    insert into auth.users
 *      (id, name)
 *    values
 *      (123, pat)`;
 *
 * would log
 * |insert into auth.users
 * |  (id, name)
 * |values
 * |  (pat, rules)
 */
export const trimIndent = (strings: TemplateStringsArray, ...replacements: string[]): string => {
  const indent = strings[0].match(/^\n*([ ]+)/)?.[1];
  const lastIndent = (indent || '').replace('  ', '');
  const re = new RegExp(`^${indent || ''}`, '');
  const reLast = new RegExp(`^(${indent || ''}|${lastIndent})`, '');

  let result = '';
  for (let i = 0; i < strings.length; ++i) {
    const tpl = strings[i]
      .split('\n')
      .map((string) => string.replace(i === strings.length - 1 ? reLast : re, ''))
      .join('\n');
    result += `${tpl}${replacements[i] ?? ''}`;
  }

  return result;
};

/**
 * Convert relative ref to root ref, stripping the trailing trimEnd
 *
 * eg: getRootRef('../pagination/model.yml', '#/components/PaginationModel', 'Model')
 */
export const getRootRef = (localRef: string, rootRef: string, trimEnd?: string): string => {
  if (!trimEnd) {
    return localRef;
  }

  const lastRootRefIndex = rootRef.lastIndexOf(trimEnd);
  if (lastRootRefIndex !== -1) {
    return rootRef.slice(0, lastRootRefIndex) + rootRef.slice(lastRootRefIndex + trimEnd.length);
  } else {
    return rootRef;
  }
};
