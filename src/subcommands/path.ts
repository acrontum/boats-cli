import { CliArg, CliExit, SubcommandGenerator, buildHelpFromOpts, parseCliArgs } from '../cli';
import { GenerationTask, logger } from '../generate';
import { getCreate, getDelete, getList, getReplace, getShow, getUpdate } from '../templates/path';
import { getModel, getModels, getPaginationModel, getParam } from '../templates/model';
import { argname, camelCase, capitalize, dashCase, description, singular } from '../lib';

export const pathCliArguments: Record<string, CliArg> = {
  list: { type: 'boolean', short: 'l', [description]: 'Create a models.yml file' },
  get: { type: 'boolean', short: 'r', [description]: 'Create a get.yml file' },
  delete: { type: 'boolean', short: 'd', [description]: 'Create a delete.yml file' },
  patch: { type: 'boolean', short: 'u', [description]: 'Create a patch.yml file' },
  put: { type: 'boolean', short: 'P', [description]: 'Create a put.yml file' },
  post: { type: 'boolean', short: 'c', [description]: 'Create a post.yml file' },
  name: { type: 'string', [argname]: 'NAME', short: 'n', [description]: 'Path name (in case positional conflicts with parent commands)' },
  'no-models': { type: 'boolean', short: 'm', [description]: 'Skip creating any models, only the path file (will create by default)' },
  model: {
    type: 'string',
    [argname]: 'DASH_NAME',
    short: 'M',
    [description]: "Custom path model name (eg 'path /search/users --model=user-search')",
  },
  help: { type: 'boolean', short: 'h', [description]: 'Show this menu' },
};

const help = (exitCode: number | null = null, message?: string): null => {
  (exitCode === 0 ? logger.console.info.bind(logger.console) : logger.console.error.bind(logger.console))(`${message ? message + '\n\n' : ''}\
Generates BOATS path / method files (and model files by default).

Usage:
  npx bc path PATH_NAME METHOD [...OPTIONS | METHOD]

Options:
${buildHelpFromOpts(pathCliArguments)}

Methods:
    list, get, delete, patch, put, post

Examples:
  npx bc path users/:id --post --get --patch
  npx bc path /users --post --list
  npx bc path 'users/:userId/albums/:albumId' --post --list --no-models

  Running:
    npx bc path users/:id --list --get --delete --patch --put
    or
    npx bc path users/{id} -crudl

  Will create:
    scaffolding:
      .boatsrc
      src/index.yml
      src/components/schemas/index.yml
      src/components/parameters/index.yml
    paths:
      src/paths/index.yml
      src/paths/users/get.yml
      src/paths/users/{id}/delete.yml
      src/paths/users/{id}/get.yml
      src/paths/users/{id}/patch.yml
      src/paths/users/{id}/put.yml
    models:
      src/components/schemas/pagination/model.yml
      src/components/schemas/user/model.yml
      src/components/schemas/user/models.yml
      src/components/schemas/user/patch.yml
      src/components/schemas/user/put.yml
    parameters:
      src/components/parameters/pathId.yml
      src/components/parameters/queryLimit.yml
      src/components/parameters/queryOffset.yml

  Running:
    npx bc path search/users --post --model user-search
  Will create:
    scaffolding:
      .boatsrc
      src/index.yml
      src/components/schemas/index.yml
      src/paths/index.yml
    paths:
      src/paths/search/users/post.yml
    models:
      src/components/schemas/user-search/model.yml
      src/components/schemas/user-search/post.yml
`);

  if (typeof exitCode === 'number') {
    throw new CliExit(exitCode);
  }

  return null;
};

const extractPathParam = (part: string): string | null => {
  const param = part.replace(/[:}{]/g, '');
  if (param !== part) {
    return param;
  }
  return null;
};

export const parsePathCommand: SubcommandGenerator = (args: string[]): GenerationTask[] | null => {
  const parsed = parseCliArgs({ options: pathCliArguments, tokens: true, args, allowPositionals: true }, help);
  if (!parsed) {
    return null;
  }

  if (parsed.values.help) {
    return help(0);
  }

  if (parsed.positionals.length !== 1 && !parsed.values.name) {
    return help(1, `path subcommand expects 1 positional argument for PATH, received ${parsed.positionals.length}\nargs:  ${args.join(' ')}`);
  }

  const name = parsed.values.name?.toString() || parsed.positionals[0];
  const parts = name.split('/').filter(Boolean);

  if (parts.length === 0) {
    return help(1, `invalid path arg "${name}"`);
  }

  const tasks = getPathTasks({ ...parsed.values, name });

  if (!tasks.length) {
    return help(1, 'Error: Nothing to do. Aborting. Did you forget crud options (eg --get)?');
  }

  return tasks;
};

type PathGenerationOptions = {
  name: string;
  'no-models'?: boolean;
  model?: string;
  type?: string;
  list?: boolean;
  get?: boolean;
  delete?: boolean;
  patch?: boolean;
  post?: boolean;
  put?: boolean;
};

export const getPathTasks = (options: PathGenerationOptions): GenerationTask[] => {
  const pathParams: { $ref: string }[] = [];
  let lastIsParam = false;
  const tasks: GenerationTask[] = [];

  const parts = options.name.split('/').filter(Boolean);
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }

    const pathParam = extractPathParam(part);
    if (pathParam) {
      lastIsParam = true;
      tasks.push({
        contents: () => getParam(pathParam, 'path'),
        filename: `src/components/parameters/path${capitalize(pathParam)}.yml`,
        generate: !options['no-models'],
      });
      pathParams.push({ $ref: `#/components/parameters/Path${capitalize(pathParam)}` });
      parts[i] = `{${pathParam}}`;
    } else {
      lastIsParam = false;
    }
  }

  const normalizedFilepath = parts.join('/');
  let normalizedBaseFilepath = parts.join('/');

  const otherPathParams = pathParams.slice();

  if (lastIsParam) {
    otherPathParams.pop();
    normalizedBaseFilepath = parts.slice(0, -1).join('/');
  }

  const customModelName = options.model?.toString() || parts[parts.length - (lastIsParam ? 2 : 1)];
  const singleModelName = options.model?.toString() || singular(customModelName);
  const dashName = dashCase(singleModelName);
  const singleName = camelCase(singleModelName);

  if (options.list) {
    tasks.push(
      { contents: () => getList(customModelName, otherPathParams), filename: `src/paths/${normalizedBaseFilepath}/get.yml` },
      { contents: () => getParam('limit', 'query', 'number'), filename: `src/components/parameters/queryLimit.yml`, generate: !options['no-models'] },
      {
        contents: () => getParam('offset', 'query', 'number'),
        filename: 'src/components/parameters/queryOffset.yml',
        generate: !options['no-models'],
      },
      { contents: getPaginationModel, filename: 'src/components/schemas/pagination/model.yml', generate: !options['no-models'] },
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !options['no-models'] },
      { contents: getModels, filename: `src/components/schemas/${dashName}/models.yml`, generate: !options['no-models'] },
    );
  }
  if (options.post) {
    tasks.push(
      { contents: getModel, filename: `src/components/schemas/${dashName}/post.yml`, generate: !options['no-models'] },
      { contents: () => getCreate(singleName, otherPathParams), filename: `src/paths/${normalizedBaseFilepath}/post.yml` },
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !options['no-models'] },
    );
  }

  if (options.get) {
    tasks.push(
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !options['no-models'] },
      { contents: () => getShow(singleName, pathParams), filename: `src/paths/${normalizedFilepath}/get.yml` },
    );
  }
  if (options.delete) {
    tasks.push({ contents: () => getDelete(singleName, pathParams), filename: `src/paths/${normalizedFilepath}/delete.yml` });
  }
  if (options.patch) {
    tasks.push(
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !options['no-models'] },
      { contents: getModel, filename: `src/components/schemas/${dashName}/patch.yml`, generate: !options['no-models'] },
      { contents: () => getUpdate(singleName, pathParams), filename: `src/paths/${normalizedFilepath}/patch.yml` },
    );
  }
  if (options.put) {
    tasks.push(
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !options['no-models'] },
      { contents: getModel, filename: `src/components/schemas/${dashName}/put.yml`, generate: !options['no-models'] },
      { contents: () => getReplace(singleName, pathParams), filename: `src/paths/${normalizedFilepath}/put.yml` },
    );
  }

  return tasks;
};
