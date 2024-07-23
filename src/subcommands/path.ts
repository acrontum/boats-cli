import { CliArg, SubcommandGenerator, buildHelpFromOpts, parseCliArgs } from '../cli';
import { GenerationTask } from '../generate';
import { getCreate, getDelete, getList, getReplace, getShow, getUpdate } from '../generators/method';
import { getModel, getModels, getPaginationModel, getParam } from '../generators/model';
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
    [description]: 'Custom path model name (eg "path /search/users --model=user-search")',
  },
  help: { type: 'boolean', short: 'h', [description]: 'Show this menu' },
};

const help = (exitCode: number | null = null, message?: string): null => {
  (exitCode === 0 ? console.log : console.error)(`${message ? message + '\n\n' : ''}\
\x1b[0;0mUsage:
  npx bc path PATH CRUD [...CRUD] [...options]

Options:
${buildHelpFromOpts(pathCliArguments)}

Examples:
  npx bc path users/:id --post --get --patch
  npx bc path users/ --post --list

  Running:
    'npx bc path users/:id --list --get --delete --patch --put'
    or
    'npx bc path users/{id} -lsdur'

  Will create:
    paths:
      users/get.yml
      users/post.yml
      users/:id/get.yml
      users/:id/delete.yml
      users/:id/patch.yml
      users/:id/put.yml
    models:
      schemas/user/models.yml (list)
      schemas/user/model.yml (show)
      schemas/user/patch.yml (update)
      schemas/user/post.yml (create)
      schemas/user/put.yml (create or replace)
    parameters:
      parameters/pathId.yml
    query params:
      parameters/queryLimit.yml
      parameters/queryOffset.yml

  Running:
    'npx bc path path search/users --post --model user-search'
  Will create:
    paths:
      src/paths/search/users/post.yml
    models:
      src/components/schemas/user-search/model.yml
      src/components/schemas/user-search/post.yml
`);

  if (typeof exitCode === 'number') {
    process.exit(exitCode);
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

  if (parsed.positionals?.length !== 1 && !parsed.values.name) {
    return help(1, `path subcommand expects 1 positional argument for PATH, received ${parsed.positionals?.length ?? 0}`);
  }

  const name = parsed.values.name?.toString() || parsed.positionals[0];
  const parts = name.split('/').filter(Boolean);

  if (parts.length === 0) {
    return help(1, `invalid path arg "${name}"`);
  }

  let pathParams: { $ref: string }[] = [];
  let lastIsParam = false;
  const tasks: GenerationTask[] = [];

  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }

    const pathParam = extractPathParam(part);
    if (pathParam) {
      lastIsParam = true;
      tasks.push({ contents: () => getParam(pathParam, 'path'), filename: `src/components/parameters/path${capitalize(pathParam)}.yml` });
      pathParams.push({ $ref: `#/components/parameters/Path${capitalize(pathParam)}` });
      parts[i] = `{${pathParam}}`;
    } else {
      lastIsParam = false;
    }
  }

  const normalizedFilepath = parts.join('/');
  let normalizedBaseFilepath = parts.join('/');

  let otherPathParams = pathParams.slice();

  if (lastIsParam) {
    otherPathParams.pop();
    normalizedBaseFilepath = parts.slice(0, -1).join('/');
  }

  const customModelName = parsed.values.model?.toString() || parts[parts.length - (lastIsParam ? 2 : 1)];
  const singleModelName = parsed.values.model?.toString() || singular(customModelName);
  const dashName = dashCase(singleModelName);
  const singleName = camelCase(singleModelName);
  pathParams = pathParams?.length ? pathParams : void 0;

  if (parsed.values.list) {
    tasks.push(
      { contents: () => getList(customModelName, otherPathParams), filename: `src/paths/${normalizedBaseFilepath}/get.yml` },
      { contents: () => getParam('limit', 'query'), filename: `src/components/parameters/queryLimit.yml`, generate: !parsed.values['no-models'] },
      { contents: () => getParam('offset', 'query'), filename: `src/components/parameters/queryOffset.yml`, generate: !parsed.values['no-models'] },
      { contents: getPaginationModel, filename: `src/components/schemas/pagination/model.yml`, generate: !parsed.values['no-models'] },
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !parsed.values['no-models'] },
      { contents: getModels, filename: `src/components/schemas/${dashName}/models.yml`, generate: !parsed.values['no-models'] },
    );
  }
  if (parsed.values.post) {
    tasks.push(
      { contents: getModel, filename: `src/components/schemas/${dashName}/post.yml` },
      { contents: () => getCreate(singleName, otherPathParams), filename: `src/paths/${normalizedBaseFilepath}/post.yml` },
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !parsed.values['no-models'] },
    );
  }

  if (parsed.values.get) {
    tasks.push(
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !parsed.values['no-models'] },
      { contents: () => getShow(singleName, pathParams), filename: `src/paths/${normalizedFilepath}/get.yml` },
    );
  }
  if (parsed.values.delete) {
    tasks.push({ contents: () => getDelete(singleName, pathParams), filename: `src/paths/${normalizedFilepath}/delete.yml` });
  }
  if (parsed.values.patch) {
    tasks.push(
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !parsed.values['no-models'] },
      { contents: getModel, filename: `src/components/schemas/${dashName}/patch.yml` },
      { contents: () => getUpdate(singleName, pathParams), filename: `src/paths/${normalizedFilepath}/patch.yml` },
    );
  }
  if (parsed.values.put) {
    tasks.push(
      { contents: getModel, filename: `src/components/schemas/${dashName}/model.yml`, generate: !parsed.values['no-models'] },
      { contents: getModel, filename: `src/components/schemas/${dashName}/put.yml` },
      { contents: () => getReplace(singleName, pathParams), filename: `src/paths/${normalizedFilepath}/put.yml` },
    );
  }

  if (!tasks.length) {
    return help(1, 'Error: Nothing to do. Aborting. Did you forget crud options (eg --get)?');
  }

  return tasks;
};
