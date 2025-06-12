// @ts-check

/** @type{import('../../../').CustomTemplates['getComponentIndex']} */
module.exports = (globalOptions, file) => {
  const remove = globalOptions['root-ref'] === '-' || globalOptions['root-ref'] === '' ? '' : `'${globalOptions['root-ref'] || 'Model'}'`;

  return `{{ autoComponentIndexer(${remove}) }}\n# ${JSON.stringify({ globalOptions, file })}\n`;
};
