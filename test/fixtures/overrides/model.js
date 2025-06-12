// @ts-check

const { writeFile, mkdir } = require('node:fs/promises');
const { toYaml } = require('../../../dist/src/lib');
const { dirname, join } = require('node:path');

/** @type{import('../../../').CustomTemplates['getModel']} */
module.exports = async (globalOptions, file) => {
  const base = join(globalOptions.output || '.', file.replace('model.yml', 'base.yml'));
  await mkdir(dirname(base), { recursive: true });
  await writeFile(
    base,
    toYaml({
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    }),
  );

  return toYaml({
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
  });
};
