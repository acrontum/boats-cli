# boats-cli

`boats-cli` is the unofficial CLI for [johndcarmichael/boats](https://github.com/johndcarmichael/boats) which makes it even easier to quickly setup and scaffold the BOATS files in a project.

<p align="center">
  <a href="https://www.npmjs.org/package/@acrontum/boats-cli" alt="npm version @acrontum/boats-cli">
    <img alt="npm version @acrontum/boats-cli" src="https://img.shields.io/npm/v/@acrontum/boats-cli">
  </a>

  <a href="https://github.com/acrontum/boats-cli" alt="Github latest tag acrontum/boats-cli">
    <img alt="Github latest tag acrontum/boats-cli" src="https://img.shields.io/github/v/tag/acrontum/boats-cli">
  </a>

  <img alt="npm minified bundle size" src="https://img.shields.io/bundlephobia/min/@acrontum/boats-cli">

  <br />

  <a href="https://github.com/acrontum/boats-cli/actions/workflows/build-node.yml" alt="CI status (node workflow)">
    <img alt="CI status (node workflow)" src="https://github.com/acrontum/boats-cli/actions/workflows/build-node.yml/badge.svg">
  </a>
</p>

**Early alpha, docs and functionality will change**

<!-- 
npx --yes doctoc --github readme.md
-->
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Quick Start](#quick-start)
- [Development](#development)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Quick Start

```bash
npx @acrontum/boats-cli --help
npx @acrontum/boats-cli path --help
npx @acrontum/boats-cli model --help
npx @acrontum/boats-cli init --help
```

For an empty boats project:

```bash
mkdir backend-spec

cd backend-spec

npm init --yes
# npm i --save-dev boats @acrontum/boats-cli

npx @acrontum/boats-cli \
  path auth/verify --get \
  path auth/login --post \
  path auth/logout --get \
  path auth/refresh-token --get \
  path albums/:albumId --post --get --patch --delete --list \
  path albums/:albumId/songs/:songId -crudl \
  model jwt \
  model search --type query

npx boats -i src/index.yml -o build/api.json
```

optionally, since it's long to type:
```bash
npm i --save-dev @acrontum/boats-cli
```
then you can just run `npx bc model test --dry-run`.


## Custom Generator Overrides

You can override any of the generators by adding any of these files to a templates folder, and passing `--templates <folder>` to the cli:
- boats-rc.js
- component-index.js
- create.js
- delete.js
- index.js
- list.js
- model.js
- models.js
- pagination-model.js
- param.js
- path-index.js
- replace.js
- show.js
- update.js

Or, alternatively, exporting any of the following methods from a module (local file or node module):
```js
exports.getBoatsRc = (opts, file) => { /* ... */ };
exports.getIndex = (opts, file) => { /* ... */ };
exports.getComponentIndex = (opts, file) => { /* ... */ };
exports.getModel = (opts, file) => { /* ... */ };
exports.getModels = (opts, file) => { /* ... */ };
exports.getParam = (opts, file) => { /* ... */ };
exports.getPaginationModel = (opts, file) => { /* ... */ };
exports.getPathIndex = (opts, file) => { /* ... */ };
exports.getList = (opts, file) => { /* ... */ };
exports.getCreate = (opts, file) => { /* ... */ };
exports.getShow = (opts, file) => { /* ... */ };
exports.getDelete = (opts, file) => { /* ... */ };
exports.getUpdate = (opts, file) => { /* ... */ };
exports.getReplace = (opts, file) => { /* ... */ };
```

for exmaple, `templates/index.js` or `exports.getList`:
```js
// @ts-check
const { toYaml } = require('@acrontum/boats-cli/dist/src/lib');

/** @type{import('@acrontum/boats-cli/').CustomTemplates['getList']} */
module.exports = (_globalOptions, file, pluralName, schemaRef, parameters) => {
  return toYaml({
    summary: `from ${file}`,
    description: `pluralName ${pluralName}`,
    ...(parameters?.length ? { parameters } : {}),
    responses: {
      '"200"': {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: schemaRef },
          },
        },
      },
    },
  });
};

````

or disabling the default generator and instead creating 2 different files for models `templates/model.yml` or `exports.getModel`:
```js
// @ts-check
const { toYaml } = require('@acrontum/boats-cli/dist/src/lib');
const { writeFile, mkdir } = require('node:fs/promises');
const { dirname, join } = require('node:path');

/** @type{import('@acrontum/boats-cli/').CustomTemplates['getModel']} */
module.exports = async (globalOptions, file) => {
  const base = join(globalOptions.output || '.', file.replace('model.yml', 'base.yml'));
  const extend = join(globalOptions.output || '.', file.replace('model.yml', 'extend.yml'));

  await mkdir(dirname(base), { recursive: true });

  await Promise.all([
    writeFile(
      base,
      toYaml({
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      }),
    ),
    writeFile(
      extend,
      toYaml({
        allOf: [
          { $ref: './base.yml' },
          {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
              },
            },
          },
        ],
      }),
    ),
  ]);

  // prevent default generation
  return '';
};
```

see [custom-models.spec.ts](./test/custom-models.spec.ts) and the [overrides folder]('./test/fixtures/overrides/') for more examples.


## Development

Configure githooks:
```bash
git config core.hooksPath $(git rev-parse --show-toplevel)/githooks/
```
