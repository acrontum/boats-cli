import { toYaml } from '../lib';

export const getComponentIndex = (trim = "'Model'"): string => `{{ autoComponentIndexer(${trim}) }}\n`;

export const getModel = (): string => {
  return toYaml({
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
  });
};

export const getModels = (paginationSchema: string = '#/components/schemas/Pagination'): string => {
  return toYaml({
    type: 'object',
    required: ['meta', 'data'],
    properties: {
      meta: { $ref: paginationSchema },
      data: {
        type: 'array',
        items: { $ref: './model.yml' },
      },
    },
  });
};

export const getParam = (name: string, paramIn: 'header' | 'path' | 'query', type: string = 'string'): string => {
  return toYaml({
    in: paramIn,
    name,
    required: paramIn === 'path',
    schema: { type },
    description: `${paramIn} param that does some stuff`,
  });
};

export const getPaginationModel = (): string => {
  return toYaml({
    type: 'object',
    required: ['offset', 'limit', 'total'],
    properties: {
      offset: { type: 'number', minimum: 0, description: 'Starting index' },
      limit: { type: 'number', minimum: 0, description: 'Max items returned' },
      total: { type: 'number', minimum: 0, description: 'Total items available' },
    },
  });
};
