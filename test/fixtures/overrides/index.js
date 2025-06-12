// @ts-check

const { toYaml } = require('../../../dist/src/lib');

/** @type{import('../../../').CustomTemplates['getIndex']} */
module.exports = (_globalOptions, file) => {
  return toYaml({
    openapi: '3.1.0',
    paths: { $ref: 'paths/index.yml' },
    info: { title: `from ${file}`, version: '1.0' },
    components: {
      parameters: { $ref: 'components/parameters/index.yml' },
      schemas: { $ref: 'components/schemas/index.yml' },
    },
  });
};
