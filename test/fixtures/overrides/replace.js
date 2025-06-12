// @ts-check

const { toYaml } = require('../../../dist/src/lib');

/** @type{import('../../../').CustomTemplates['getReplace']} */
module.exports = (_globalOptions, file, singularName) =>
  toYaml({
    summary: `upsert ${singularName}`,
    description: `from ${file}`,
  });
