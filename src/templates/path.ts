import { capitalize, dashCase, toYaml } from '../lib';

export const getPathIndex = (): string => '{{ autoPathIndexer() }}\n';

export const getList = (pluralName: string, schemaRef: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(pluralName).replace(/-/g, ' ');

  return toYaml({
    summary: `List ${spaceName}`,
    description: `List ${spaceName}`,
    ...(parameters?.length ? { parameters } : {}),
    responses: {
      '"200"': {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: schemaRef },
          },
        },
      },
    },
  });
};

export const getCreate = (singularName: string, requestSchemaRef: string, responseSchemaRef: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Create a ${spaceName}`,
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
      '"422"': {
        description: `Invalid ${spaceName} supplied`,
      },
      '"201"': {
        description: 'Created',
        content: {
          'application/json': {
            schema: { $ref: responseSchemaRef },
          },
        },
      },
    },
  });
};

export const getShow = (singularName: string, responseSchemaRef: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Show ${spaceName}`,
    ...(parameters?.length ? { parameters } : {}),
    responses: {
      '"404"': {
        description: `${capitalize(spaceName)} not found`,
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

export const getDelete = (singularName: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Delete ${spaceName}`,
    ...(parameters?.length ? { parameters } : {}),
    responses: {
      '"404"': {
        description: `${capitalize(spaceName)} not found`,
      },
      '"204"': {
        description: 'Deleted',
      },
    },
  });
};

export const getUpdate = (singularName: string, requestSchemaRef: string, responseSchemaRef: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Update ${spaceName}`,
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

export const getReplace = (singularName: string, requestSchemaRef: string, responseSchemaRef: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Create or replace ${spaceName}`,
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
      '"422"': {
        description: `Invalid ${spaceName} supplied`,
      },
      '"201"': {
        description: 'Created',
        content: {
          'application/json': {
            schema: { $ref: responseSchemaRef },
          },
        },
      },
      '"200"': {
        description: 'Replaced',
        content: {
          'application/json': {
            schema: { $ref: responseSchemaRef },
          },
        },
      },
    },
  });
};
