import { CliArg, CliExit, GlobalOptions, SubcommandGenerator, buildHelpFromOpts, cliArguments, parseCliArgs } from '../cli';
import { GenerationTask, logger } from '../generate';
import { argname, camelCase, capitalize, dashCase, description, getRootRef } from '../lib';
import { getModel, getModels, getPaginationModel, getParam } from '../templates/model';

type ModelGenerationOptions = {
  name: string;
  'no-model'?: boolean;
  type?: 'query' | 'header' | 'path';
  list?: boolean;
  crud?: boolean;
  get?: boolean;
  delete?: boolean;
  patch?: boolean;
  post?: boolean;
  put?: boolean;
  rootRef?: string;
};

export const modelCliArguments: Record<string, CliArg> = {
  'no-model': { type: 'boolean', short: 'm', [description]: 'Skip creating a model.yml file with CRUD operations (will create by default)' },
  crud: { type: 'boolean', short: 'A', [description]: 'Short for -crudl' },
  delete: { type: 'boolean', short: 'd', [description]: 'Create a delete.yml file' },
  get: { type: 'boolean', short: 'r', [description]: 'Create a get.yml file' },
  help: { type: 'boolean', short: 'h', [description]: 'Show this menu' },
  list: { type: 'boolean', short: 'l', [description]: 'Create a models.yml file' },
  name: { type: 'string', short: 'n', [description]: 'Model name (in case positional conflicts with parent commands)' },
  patch: { type: 'boolean', short: 'u', [description]: 'Create a patch.yml file' },
  post: { type: 'boolean', short: 'c', [description]: 'Create a post.yml file' },
  put: { type: 'boolean', short: 'P', [description]: 'Create a put.yml file' },
  quest: { type: 'boolean', [description]: 'Create a put.yml file' },
  type: { type: 'string', [argname]: 'PARAM_TYPE', short: 't', [description]: 'Generate query, path, or header param' },
};

const help = (exitCode: number | null = null, message?: string): null => {
  (exitCode === 0 ? logger.console.info.bind(logger.console) : logger.console.error.bind(logger.console))(`${message ? message + '\n\n' : ''}\
Generates BOATS model files.

Usage:
  npx bc model SINGULAR_NAME [OPTIONS]

Options:
${buildHelpFromOpts(modelCliArguments)}
Global options:
${buildHelpFromOpts(cliArguments)}
Examples:
  Running:
    npx bc model user --list --get --delete --patch --put
    which is the same as:
    npx bc model user -crudl' or 'npx bc model user -A

  Will create:
    scaffolding:
      .boatsrc
      src/index.yml
      src/components/schemas/index.yml
      src/components/parameters/index.yml
    models:
      src/components/schemas/pagination/model.yml
      src/components/schemas/user/delete.yml
      src/components/schemas/user/get.yml
      src/components/schemas/user/model.yml
      src/components/schemas/user/models.yml
      src/components/schemas/user/patch.yml
      src/components/schemas/user/put.yml
    params:
      src/components/parameters/queryLimit.yml
      src/components/parameters/queryOffset.yml

  npx bc model --name path --type header

  Will create:
    scaffolding:
      .boatsrc
      src/index.yml
      src/components/parameters/index.yml
    params:
      src/components/parameters/headerPath.yml
`);

  if (typeof exitCode === 'number') {
    throw new CliExit(exitCode);
  }

  return null;
};

export const parseModelCommand: SubcommandGenerator = (args: string[], globalOptions: GlobalOptions): GenerationTask[] | null => {
  const parsed = parseCliArgs({ options: modelCliArguments, tokens: true, args, allowPositionals: true }, help);
  if (!parsed) {
    return null;
  }

  if (parsed.values.help) {
    return help(0);
  }

  if (parsed.positionals.length !== 1 && !parsed.values.name) {
    return help(1, `model subcommand expects 1 positional argument for SINGULAR_NAME\nargs:  ${args.join(' ')}`);
  }

  const name = parsed.values.name?.toString() || parsed.positionals[0];

  if (parsed.values.type && parsed.values.type !== 'query' && parsed.values.type !== 'header' && parsed.values.type !== 'path') {
    return help(1, 'Error: --type argument must be query, header, or path');
  }

  return getModelTasks({ ...parsed.values, rootRef: globalOptions['root-ref'], name });
};

export const getModelTasks = (options: ModelGenerationOptions): GenerationTask[] => {
  const camelName = camelCase(options.name);
  const dashName = dashCase(options.name);

  const tasks: GenerationTask[] = [];
  tasks.push({
    contents: getModel,
    filename: `src/components/schemas/${dashName}/model.yml`,
    generate: !options['no-model'] && !options.type,
  });

  const paginationRef = getRootRef('../pagination/model.yml', '#/components/schemas/PaginationModel', options.rootRef);
  if (options.type) {
    tasks.push({
      contents: () => getParam(options.name, options.type as Exclude<(typeof options)['type'], undefined>),
      filename: `src/components/parameters/${options.type}${capitalize(camelName)}.yml`,
    });
  }

  if (options.list || options.crud) {
    tasks.push(
      { contents: () => getModels(paginationRef), filename: `src/components/schemas/${dashName}/models.yml` },
      { contents: () => getParam('limit', 'query', 'integer'), filename: `src/components/parameters/queryLimit.yml` },
      { contents: () => getParam('offset', 'query', 'integer'), filename: `src/components/parameters/queryOffset.yml` },
      { contents: () => getPaginationModel(), filename: `src/components/schemas/pagination/model.yml` },
    );
  }
  if (options.get || options.crud) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/get.yml` });
  }
  if (options.delete || options.crud) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/delete.yml` });
  }
  if (options.patch || options.crud) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/patch.yml` });
  }
  if (options.post || options.crud) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/post.yml` });
  }
  if (options.put) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/put.yml` });
  }

  return tasks;
};
