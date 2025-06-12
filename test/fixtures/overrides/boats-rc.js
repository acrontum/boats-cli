// @ts-check

/**
 * @type{import('../../../').CustomTemplates['getBoatsRc']}
 * @returns{string|null}
 */
module.exports = (_globalOptions, file) => {
  return `{ fancyPluralization: true, filename: "${file}" }\n`;
};
