// @ts-check

const { toYaml } = require('../../../dist/src/lib');

/** @type{import('../../../').CustomTemplates['getCreate']} */
module.exports = (_globalOptions, file) => {
  return toYaml({
    summary: 'create',
    description: `from ${file}`,
  });
};
