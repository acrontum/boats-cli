// @ts-check

const { toYaml } = require('../../../../dist/src/lib');

/** @type{import('../../../../').CustomTemplates['getModels']} */
module.exports = (_globalOptions, _file) => {
  return toYaml({
    type: 'object',
    required: ['meta', 'data'],
    properties: {
      meta: { $ref: '#/components/schemas/Pagination' },
      data: {
        type: 'array',
        items: { $ref: './model.yml' },
      },
    },
  });
};
