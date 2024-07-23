import { CliArg, SubcommandGenerator, buildHelpFromOpts, parseCliArgs } from '../cli';
import { GenerationTask } from '../generate';
import { getModel, getModels, getPaginationModel, getParam } from '../generators/model';
import { argname, camelCase, capitalize, dashCase, description } from '../lib';

export const modelCliArguments: Record<string, CliArg> = {
  'no-model': { type: 'boolean', short: 'm', [description]: 'Skip creating a model.yml file with CRUD operations (will create by default)' },
  post: { type: 'boolean', short: 'c', [description]: 'Create a post.yml file' },
  get: { type: 'boolean', short: 'r', [description]: 'Create a get.yml file' },
  patch: { type: 'boolean', short: 'u', [description]: 'Create a patch.yml file' },
  delete: { type: 'boolean', short: 'd', [description]: 'Create a delete.yml file' },
  list: { type: 'boolean', short: 'l', [description]: 'Create a models.yml file' },
  put: { type: 'boolean', short: 'U', [description]: 'Create a put.yml file' },
  name: { type: 'string', short: 'n', [description]: 'Model name (in case positional conflicts with parent commands)' },
  crud: { type: 'boolean', short: 'A', [description]: 'Short for -crudl' },
  type: { type: 'string', [argname]: 'PARAM_TYPE', short: 't', [description]: 'Generate query, path, or header param' },
  help: { type: 'boolean', short: 'h', [description]: 'Show this menu' },
};

const help = (exitCode: number | null = null, message?: string): null => {
  (exitCode === 0 ? console.log : console.error)(`${message ? message + '\n\n' : ''}\
\x1b[0;0mUsage:
  npx bc model SINGULAR_NAME [options]

Options:
${buildHelpFromOpts(modelCliArguments)}
Examples:
  npx bc model user --list --get --delete --patch --put
  or
  npx bc model user -lrduU

  Will create:
    models:
      schemas/user/delete.yml (delete)
      schemas/user/model.yml (show)
      schemas/user/models.yml (list)
      schemas/user/patch.yml (update)
      schemas/user/post.yml (create)
      schemas/user/put.yml (create or replace)
      schemas/pagination/model.yml (from --list)
    query params (from --list):
      parameters/queryLimit.yml
      parameters/queryOffset.yml

  npx bc model --name path --type header
`);

  if (typeof exitCode === 'number') {
    process.exit(exitCode);
  }

  return null;
};

export const parseModelCommand: SubcommandGenerator = (args: string[]): GenerationTask[] | null => {
  const parsed = parseCliArgs({ options: modelCliArguments, tokens: true, args, allowPositionals: true }, help);
  if (!parsed) {
    return null;
  }

  if (parsed.values.help) {
    return help(0);
  }

  if (parsed.positionals?.length !== 1 && !parsed.values.name) {
    return help(1, 'model subcommand expects 1 positional argument for SINGULAR_NAME');
  }
  const name = parsed.values.name?.toString() || parsed.positionals[0];
  const camelName = camelCase(name);
  const dashName = dashCase(name);

  const tasks: GenerationTask[] = [];
  tasks.push({
    contents: getModel,
    filename: `src/components/schemas/${dashName}/model.yml`,
    generate: !parsed.values['no-model'] && !parsed.values.type,
  });

  if (parsed.values.type) {
    if (parsed.values.type !== 'query' && parsed.values.type !== 'header' && parsed.values.type !== 'path') {
      return help(1, 'Error: --type argument must be query, header, or path');
    }

    tasks.push({
      contents: () => getParam(name, parsed.values.type as 'query'),
      filename: `src/components/parameters/${parsed.values.type}${capitalize(camelName)}.yml`,
    });
  }

  if (parsed.values.list || parsed.values.crud) {
    tasks.push(
      { contents: getModels, filename: `src/components/schemas/${dashName}/models.yml` },
      { contents: () => getParam('limit', 'query'), filename: `src/components/parameters/queryLimit.yml` },
      { contents: () => getParam('offset', 'query'), filename: `src/components/parameters/queryOffset.yml` },
      { contents: () => getPaginationModel(), filename: `src/components/schemas/pagination/model.yml` },
    );
  }
  if (parsed.values.get || parsed.values.crud) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/get.yml` });
  }
  if (parsed.values.delete || parsed.values.crud) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/delete.yml` });
  }
  if (parsed.values.patch || parsed.values.crud) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/patch.yml` });
  }
  if (parsed.values.post || parsed.values.crud) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/post.yml` });
  }
  if (parsed.values.put) {
    tasks.push({ contents: getModel, filename: `src/components/schemas/${dashName}/put.yml` });
  }

  return tasks;
};
