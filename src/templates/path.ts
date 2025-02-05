import { capitalize, dashCase, toYaml } from '../lib';

export const getPathIndex = (): string => '{{ autoPathIndexer() }}\n';

export const getList = (pluralName: string, parameters?: { $ref: string }[]): string => {
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
            schema: {
              $ref: `#/components/schemas/${capitalize(pluralName)}`,
            },
          },
        },
      },
    },
  });
};

export const getCreate = (singularName: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Create a ${spaceName}`,
    ...(parameters?.length ? { parameters } : {}),
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${capitalize(singularName)}Post` },
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
            schema: { $ref: `#/components/schemas/${capitalize(singularName)}` },
          },
        },
      },
    },
  });
};

export const getShow = (singularName: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Show ${spaceName}`,
    ...(parameters?.length ? { parameters } : {}),
    responses: {
      '"404"': {
        description: `${spaceName} not found`,
      },
      '"200"': {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${capitalize(singularName)}` },
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
        description: `${spaceName} not found`,
      },
      '"204"': {
        description: 'Deleted',
      },
    },
  });
};

export const getUpdate = (singularName: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Update ${spaceName}`,
    ...(parameters?.length ? { parameters } : {}),
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${capitalize(singularName)}Patch` },
        },
      },
    },
    responses: {
      '"404"': {
        description: `${spaceName} not found`,
      },
      '"422"': {
        description: `Invalid ${spaceName} supplied`,
      },
      '"200"': {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${capitalize(singularName)}` },
          },
        },
      },
    },
  });
};

export const getReplace = (singularName: string, parameters?: { $ref: string }[]): string => {
  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml({
    summary: `Create or replace ${spaceName}`,
    ...(parameters?.length ? { parameters } : {}),
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${capitalize(singularName)}Put` },
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
            schema: { $ref: `#/components/schemas/${capitalize(singularName)}` },
          },
        },
      },
      '"200"': {
        description: 'Replaced',
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${capitalize(singularName)}` },
          },
        },
      },
    },
  });
};
