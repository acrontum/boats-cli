import { GlobalOptions } from '../cli';
import { toYaml } from '../lib';

export const getComponentIndex = (rootRef?: string): string => {
  if (rootRef === '-' || rootRef === '') {
    return '{{ autoComponentIndexer() }}\n';
  }

  return `{{ autoComponentIndexer('${rootRef || 'Model'}') }}\n`;
};

export const getModel = (globalOptions: GlobalOptions): string => {
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

export const getModels = (globalOptions: GlobalOptions, paginationRef: string = '../pagination/model.yml'): string => {
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

export const getParam = (globalOptions: GlobalOptions, name: string, paramIn: 'header' | 'path' | 'query', type: string = 'string'): string => {
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

export const getPaginationModel = (globalOptions: GlobalOptions): string => {
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
