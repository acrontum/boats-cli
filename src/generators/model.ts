import { toYaml } from '../lib';

export const getComponentIndex = (trim = "'Model'"): string => `{{ autoComponentIndexer(${trim}) }}`;

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

export const getModels = (paginationSchema: string = '#/components/schemas/Pagination') => {
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

export const getParam = (name: string, paramIn: 'header' | 'path' | 'query', format?: string, required?: boolean) => {
  return toYaml({
    in: paramIn,
    name,
    required: typeof required !== 'undefined' ? required : paramIn === 'path',
    schema: { type: 'string', ...(format ? { format } : {}) },
    description: `${paramIn} param that does some stuff`,
  });
};

export const getPaginationModel = () => {
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
