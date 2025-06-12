// @ts-check

const { toYaml } = require('../../../dist/src/lib');

/** @type{import('../../../').CustomTemplates['getShow']} */
module.exports = (_globalOptions, file) => {
  return toYaml({
    summary: `Show something, from ${file}`,
    responses: {
      '"404"': {
        description: 'not found',
      },
      '"200"': {
        description: 'Success',
        content: {
          'text/plain': {
            schema: { type: 'string' },
          },
        },
      },
    },
  });
};
