// @ts-check

const { toYaml } = require('../../../dist/src/lib');

/** @type{import('../../../').CustomTemplates['getParam']} */
module.exports = (_globalOptions, file, name, paramIn, type = 'string') => {
  return toYaml({
    in: paramIn,
    name,
    required: paramIn === 'path',
    schema: { type },
    description: `${paramIn} param that does some stuff`,
    example: `dont pass in a file, like this: ${file}`,
  });
};
