// @ts-check

const { toYaml, capitalize, dashCase } = require('../../../dist/src/lib');

/** @type{import('../../../').CustomTemplates['getUpdate']} */
module.exports = (_globalOptions, file, singularName, requestSchemaRef, responseSchemaRef, parameters) => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Update parts of a ${singularName}`,
    description: `from ${file}`,
    ...(parameters?.length ? { parameters } : {}),
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: requestSchemaRef },
        },
      },
    },
    responses: {
      '"404"': {
        description: `${capitalize(spaceName)} not found`,
      },
      '"422"': {
        description: `Invalid ${spaceName} supplied`,
      },
      '"200"': {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: responseSchemaRef },
          },
        },
      },
    },
  });
};
