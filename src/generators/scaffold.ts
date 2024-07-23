import { toYaml } from '../lib';

const autoTagOpid = `
{{
  inject([
    {
      toAllOperations: {
        content: "
          tags:
            - {{ autoTag() }}
          operationId: {{ uniqueOpId() }}
        "
      }
    }
  ])
}}`;

export const getIndex = (): string => {
  const yaml = toYaml({
    openapi: '3.1.0',
    info: {
      version: "{{ packageJson('version') }}",
      title: "{{ packageJson('name') }}",
      description: 'our sweet api',
      contact: { name: 'acrontum', email: 'support@acrontum.de' },
      license: { name: 'Apache 2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0.html' },
    },
    servers: [{ url: '/v1' }],
    paths: { $ref: 'paths/index.yml' },
    components: {
      parameters: { $ref: 'components/parameters/index.yml' },
      schemas: { $ref: 'components/schemas/index.yml' },
    },
  });

  return `${yaml}\n${autoTagOpid}`;
};

export const getBoatsRc = (): string => {
  return JSON.stringify(
    {
      nunjucksOptions: {
        // this empty object just needs to exist, otherwise boats explodes
        tags: {},
      },

      picomatchOptions: {
        bash: true,
      },
      permissionConfig: {
        globalPrefix: true,
      },
      paths: {
        '@shared/': '../shared/',
      },
      fancyPluralization: true,
    },
    null,
    2,
  );
};
