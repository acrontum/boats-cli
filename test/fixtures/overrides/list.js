// @ts-check

const { toYaml } = require('../../../dist/src/lib');

/** @type{import('../../../').CustomTemplates['getList']} */
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
