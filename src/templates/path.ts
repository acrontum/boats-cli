import { GlobalOptions } from '../cli';
import { capitalize, dashCase, toYaml } from '../lib';

export const getPathIndex = (globalOptions: GlobalOptions, file: string): string => {
  if (typeof globalOptions.customTemplates?.getPathIndex === 'function') {
    return globalOptions.customTemplates.getPathIndex(globalOptions, file);
  }

  return '{{ autoPathIndexer() }}\n';
};

export const getList = (
  globalOptions: GlobalOptions,
  file: string,
  pluralName: string,
  schemaRef: string,
  parameters?: { $ref: string }[],
): string => {
  if (typeof globalOptions.customTemplates?.getList === 'function') {
    return globalOptions.customTemplates.getList(globalOptions, file, pluralName, schemaRef, parameters);
  }

  const spaceName = dashCase(pluralName).replace(/-/g, ' ');

  return toYaml(
    {
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
    },
    true,
    !globalOptions['no-quote'],
  );
};

export const getCreate = (
  globalOptions: GlobalOptions,
  file: string,
  singularName: string,
  requestSchemaRef: string,
  responseSchemaRef: string,
  parameters?: { $ref: string }[],
): string => {
  if (typeof globalOptions.customTemplates?.getCreate === 'function') {
    return globalOptions.customTemplates.getCreate(globalOptions, file, singularName, requestSchemaRef, responseSchemaRef, parameters);
  }

  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml(
    {
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
    },
    true,
    !globalOptions['no-quote'],
  );
};

export const getShow = (
  globalOptions: GlobalOptions,
  file: string,
  singularName: string,
  responseSchemaRef: string,
  parameters?: { $ref: string }[],
): string => {
  if (typeof globalOptions.customTemplates?.getShow === 'function') {
    return globalOptions.customTemplates.getShow(globalOptions, file, singularName, responseSchemaRef, parameters);
  }

  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml(
    {
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
    },
    true,
    !globalOptions['no-quote'],
  );
};

export const getDelete = (globalOptions: GlobalOptions, file: string, singularName: string, parameters?: { $ref: string }[]): string => {
  if (typeof globalOptions.customTemplates?.getDelete === 'function') {
    return globalOptions.customTemplates.getDelete(globalOptions, file, singularName, parameters);
  }

  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml(
    {
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
    },
    true,
    !globalOptions['no-quote'],
  );
};

export const getUpdate = (
  globalOptions: GlobalOptions,
  file: string,
  singularName: string,
  requestSchemaRef: string,
  responseSchemaRef: string,
  parameters?: { $ref: string }[],
): string => {
  if (typeof globalOptions.customTemplates?.getUpdate === 'function') {
    return globalOptions.customTemplates.getUpdate(globalOptions, file, singularName, requestSchemaRef, responseSchemaRef, parameters);
  }

  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml(
    {
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
    },
    true,
    !globalOptions['no-quote'],
  );
};

export const getReplace = (
  globalOptions: GlobalOptions,
  file: string,
  singularName: string,
  requestSchemaRef: string,
  responseSchemaRef: string,
  parameters?: { $ref: string }[],
): string => {
  if (typeof globalOptions.customTemplates?.getReplace === 'function') {
    return globalOptions.customTemplates.getReplace(globalOptions, file, singularName, requestSchemaRef, responseSchemaRef, parameters);
  }

  const spaceName = dashCase(singularName).replace(/-/g, ' ');

  return toYaml(
    {
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
    },
    true,
    !globalOptions['no-quote'],
  );
};
