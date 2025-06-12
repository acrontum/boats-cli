// @ts-check

const { toYaml } = require('../../../dist/src/lib');

/** @type{import('../../../').CustomTemplates['getDelete']} */
module.exports = (_globalOptions, file) => {
  return toYaml({
    summary: 'delete',
    description: `from ${file}`,
  });
};
