// @ts-check

const { getPaginationModel } = require('../../../dist/src/templates/model');

/** @type{import('../../../').CustomTemplates['getPaginationModel']} */
module.exports = (globalOptions, file) => {
  const original = getPaginationModel({ 'no-quote': globalOptions['no-quote'] }, file);

  return original + '\n# more on this later';
};
