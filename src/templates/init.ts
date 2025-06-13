import { GlobalOptions } from '../cli';
import { toYaml } from '../lib';

export const autoTagOpid = `
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

export const getIndex = (globalOptions: GlobalOptions, file: string): string => {
  if (typeof globalOptions.customTemplates?.getIndex === 'function') {
    return globalOptions.customTemplates.getIndex(globalOptions, file);
  }

  const yaml = toYaml(
    {
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
    },
    true,
    !globalOptions['no-quote'],
  );

  return `${yaml}${autoTagOpid}\n`;
};

export const getBoatsRc = (globalOptions: GlobalOptions, file: string): string => {
  if (typeof globalOptions.customTemplates?.getBoatsRc === 'function') {
    return globalOptions.customTemplates.getBoatsRc(globalOptions, file);
  }

  return (
    JSON.stringify(
      {
        picomatchOptions: {
          bash: true,
        },
        fancyPluralization: true,
      },
      null,
      2,
    ) + '\n'
  );
};
