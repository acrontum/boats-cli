import { GlobalOptions } from '../cli';
import { toYaml } from '../lib';

export const getComponentIndex = (globalOptions: GlobalOptions, file: string): string => {
  if (typeof globalOptions.customTemplates?.getComponentIndex === 'function') {
    return globalOptions.customTemplates.getComponentIndex(globalOptions, file);
  }

  if (globalOptions['root-ref'] === '-' || globalOptions['root-ref'] === '') {
    return '{{ autoComponentIndexer() }}\n';
  }

  return `{{ autoComponentIndexer('${globalOptions['root-ref'] || 'Model'}') }}\n`;
};

export const getModel = (globalOptions: GlobalOptions, file: string): string => {
  if (typeof globalOptions.customTemplates?.getModel === 'function') {
    return globalOptions.customTemplates.getModel(globalOptions, file);
  }

  return toYaml(
    {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Name of the thing, separated by dashes (-)',
          example: 'this-is-an-example',
          minLength: 1,
          pattern: '\\\\S',
          nullable: true,
        },
      },
    },
    true,
    !globalOptions['no-quote'],
  );
};

export const getModels = (globalOptions: GlobalOptions, file: string, paginationRef: string = '../pagination/model.yml'): string => {
  if (typeof globalOptions.customTemplates?.getModels === 'function') {
    return globalOptions.customTemplates.getModels(globalOptions, file, paginationRef);
  }

  return toYaml(
    {
      type: 'object',
      required: ['meta', 'data'],
      properties: {
        meta: { $ref: paginationRef },
        data: {
          type: 'array',
          items: { $ref: './model.yml' },
        },
      },
    },
    true,
    !globalOptions['no-quote'],
  );
};

export const getParam = (
  globalOptions: GlobalOptions,
  file: string,
  name: string,
  paramIn: 'header' | 'path' | 'query',
  type: string = 'string',
): string => {
  if (typeof globalOptions.customTemplates?.getParam === 'function') {
    return globalOptions.customTemplates.getParam(globalOptions, file, name, paramIn, type);
  }

  return toYaml(
    {
      in: paramIn,
      name,
      required: paramIn === 'path',
      schema: { type },
      description: `${paramIn} param that does some stuff`,
    },
    true,
    !globalOptions['no-quote'],
  );
};

export const getPaginationModel = (globalOptions: GlobalOptions, file: string): string => {
  if (typeof globalOptions.customTemplates?.getPaginationModel === 'function') {
    return globalOptions.customTemplates.getPaginationModel(globalOptions, file);
  }

  return toYaml(
    {
      type: 'object',
      required: ['offset', 'limit', 'total'],
      properties: {
        offset: { type: 'integer', minimum: 0, description: 'Starting index' },
        limit: { type: 'integer', minimum: 0, description: 'Max items returned' },
        total: { type: 'integer', minimum: 0, description: 'Total items available' },
      },
    },
    true,
    !globalOptions['no-quote'],
  );
};
