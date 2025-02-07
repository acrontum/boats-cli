import assert from 'node:assert';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { beforeEach, describe, it } from 'node:test';
import { cli } from '../src/cli';
import { trimIndent } from '../src/lib';
import { boats } from './boats';
import { baseModel, getAllFiles, getFile, toArgv } from './shared';

describe('model.spec.ts', async () => {
  beforeEach(async () => {
    await rm('test/output/model', { recursive: true, force: true });
  });

  await it('generates model files with correct content', async () => {
    assert.equal(
      baseModel,
      trimIndent`\
        type: "object"
        required:
          - "name"
        properties:
          name:
            type: "string"
            description: "Name of the thing, separated by dashes (-)"
            example: "this-is-an-example"
            minLength: 1
            pattern: "\\\\S"
            nullable: true
      `,
    );

    let files = await cli(toArgv('model user --post --list --get --delete --patch --put --output test/output/model --quiet --dry-run'));
    await assert.rejects(readdir('test/output/model'));

    files = await cli(toArgv('model user --post --list --get --delete --patch --put --output test/output/model --quiet'));
    const outputFiles = Object.keys(files).sort();
    assert.deepStrictEqual(
      outputFiles,
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user/delete.yml',
        'test/output/model/src/components/schemas/user/get.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/components/schemas/user/models.yml',
        'test/output/model/src/components/schemas/user/patch.yml',
        'test/output/model/src/components/schemas/user/post.yml',
        'test/output/model/src/components/schemas/user/put.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );
    assert.deepStrictEqual(await getAllFiles('test/output/model'), outputFiles, 'files mismatch');

    assert.equal(
      await getFile('test/output/model/.boatsrc'),
      trimIndent`\
        {
          "nunjucksOptions": {
            "tags": {}
          },
          "picomatchOptions": {
            "bash": true
          },
          "permissionConfig": {
            "globalPrefix": true
          },
          "paths": {
            "@shared/": "../shared/"
          },
          "fancyPluralization": true
        }
      `,
    );

    assert.equal(await getFile('test/output/model/src/components/parameters/index.yml'), '{{ autoComponentIndexer() }}\n');

    assert.equal(
      await getFile('test/output/model/src/components/parameters/queryLimit.yml'),
      trimIndent`\
        in: "query"
        name: "limit"
        required: false
        schema:
          type: "number"
        description: "query param that does some stuff"
      `,
    );

    assert.equal(
      await getFile('test/output/model/src/components/parameters/queryOffset.yml'),
      trimIndent`\
        in: "query"
        name: "offset"
        required: false
        schema:
          type: "number"
        description: "query param that does some stuff"
      `,
    );

    assert.equal(await getFile('test/output/model/src/components/schemas/index.yml'), "{{ autoComponentIndexer('Model') }}\n");

    assert.equal(
      await getFile('test/output/model/src/components/schemas/pagination/model.yml'),
      trimIndent`\
        type: "object"
        required:
          - "offset"
          - "limit"
          - "total"
        properties:
          offset:
            type: "number"
            minimum: 0
            description: "Starting index"
          limit:
            type: "number"
            minimum: 0
            description: "Max items returned"
          total:
            type: "number"
            minimum: 0
            description: "Total items available"
      `,
    );

    assert.equal(await getFile('test/output/model/src/components/schemas/user/delete.yml'), baseModel);

    assert.equal(await getFile('test/output/model/src/components/schemas/user/get.yml'), baseModel);

    assert.equal(await getFile('test/output/model/src/components/schemas/user/model.yml'), baseModel);

    assert.equal(
      await getFile('test/output/model/src/components/schemas/user/models.yml'),
      trimIndent`\
        type: "object"
        required:
          - "meta"
          - "data"
        properties:
          meta:
            $ref: "../pagination/model.yml"
          data:
            type: "array"
            items:
              $ref: "./model.yml"
      `,
    );

    assert.equal(await getFile('test/output/model/src/components/schemas/user/patch.yml'), baseModel);

    assert.equal(await getFile('test/output/model/src/components/schemas/user/post.yml'), baseModel);

    assert.equal(await getFile('test/output/model/src/components/schemas/user/put.yml'), baseModel);

    const indexFileContent = await getFile('test/output/model/src/index.yml');
    assert.equal(
      indexFileContent,
      trimIndent`\
        openapi: "3.1.0"
        info:
          version: "{{ packageJson('version') }}"
          title: "{{ packageJson('name') }}"
          description: "our sweet api"
          contact:
            name: "acrontum"
            email: "support@acrontum.de"
          license:
            name: "Apache 2.0"
            url: "https://www.apache.org/licenses/LICENSE-2.0.html"
        servers:
          - url: "/v1"
        paths:
          $ref: "paths/index.yml"
        components:
          parameters:
            $ref: "components/parameters/index.yml"
          schemas:
            $ref: "components/schemas/index.yml"

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
        }}
      `,
    );

    // boats will fail when paths index doesnt exist (it's assumed eventually it would)
    const indexNoPaths = indexFileContent.replace('paths:\n  $ref: "paths/index.yml"', '');
    await writeFile('test/output/model/src/index.yml', indexNoPaths, { encoding: 'utf8' });

    await mkdir('test/output/model/spec/', { recursive: true });
    let indexFile = await boats('test/output/model/src/index.yml', 'test/output/model/spec/api.json', false);
    assert.strictEqual(indexFile !== '', true, 'boats failed');
    assert.strictEqual(await getFile(indexFile), await getFile('test/fixtures/spec/model.json'), 'spec mismatch');

    files = await cli(toArgv('model user -crudlP --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user/delete.yml',
        'test/output/model/src/components/schemas/user/get.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/components/schemas/user/models.yml',
        'test/output/model/src/components/schemas/user/patch.yml',
        'test/output/model/src/components/schemas/user/post.yml',
        'test/output/model/src/components/schemas/user/put.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user -A --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user/delete.yml',
        'test/output/model/src/components/schemas/user/get.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/components/schemas/user/models.yml',
        'test/output/model/src/components/schemas/user/patch.yml',
        'test/output/model/src/components/schemas/user/post.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    await writeFile('test/output/model/src/index.yml', indexNoPaths, { encoding: 'utf8' });

    await mkdir('test/output/model/spec/', { recursive: true });
    indexFile = await boats('test/output/model/src/index.yml', 'test/output/model/spec/api.json', false);
    assert.strictEqual(indexFile !== '', true, 'boats failed');
    assert.strictEqual(await getFile(indexFile), await getFile('test/fixtures/spec/model.json'), 'spec mismatch');
  });

  await it('generates the correct model files', async () => {
    let files = await cli(toArgv('model user --list --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/components/schemas/user/models.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user --get --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/user/get.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user --post --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/components/schemas/user/post.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user --put --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/components/schemas/user/put.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user --patch --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/components/schemas/user/patch.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user --delete --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/user/delete.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );
  });

  await it('can customize model output', async () => {
    let files = await cli(toArgv('model user --list --no-model --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user/models.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user --list --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/components/schemas/user/models.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user --type header --no-model --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/headerUser.yml',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user --type header --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/headerUser.yml',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model user --list --name someUser --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/some-user/model.yml',
        'test/output/model/src/components/schemas/some-user/models.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model --type header --name someOtherUser --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/headerSomeOtherUser.yml',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    files = await cli(toArgv('model positional --type query --name overridden --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryOverridden.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );
  });

  await it('handles different naming patterns', async () => {
    const assertSpecCompiled = async (): Promise<void> => {
      const indexFileContent = await getFile('test/output/model/src/index.yml');
      // boats will fail when paths index doesnt exist (it's assumed eventually it would)
      const indexNoPaths = indexFileContent.replace('paths:\n  $ref: "paths/index.yml"', '');
      await writeFile('test/output/model/src/index.yml', indexNoPaths, { encoding: 'utf8' });

      await mkdir('test/output/model/spec/', { recursive: true });
      const indexFile = await boats('test/output/model/src/index.yml', 'test/output/model/spec/api.json', false);
      assert.strictEqual(indexFile !== '', true, 'boats failed');
      assert.strictEqual(await getFile(indexFile), await getFile('test/fixtures/spec/model-naming.json'), 'spec mismatch');
    };

    let files = await cli(toArgv('model userModel --list --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user-model/model.yml',
        'test/output/model/src/components/schemas/user-model/models.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );
    await assertSpecCompiled();

    files = await cli(toArgv('model user-model --list --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user-model/model.yml',
        'test/output/model/src/components/schemas/user-model/models.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );
    await assertSpecCompiled();

    files = await cli(toArgv('model UserModel --list --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user-model/model.yml',
        'test/output/model/src/components/schemas/user-model/models.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );
    await assertSpecCompiled();

    files = await cli(['model', 'user model', '--list', '--output', 'test/output/model', '--quiet']);
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/parameters/index.yml',
        'test/output/model/src/components/parameters/queryLimit.yml',
        'test/output/model/src/components/parameters/queryOffset.yml',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/pagination/model.yml',
        'test/output/model/src/components/schemas/user-model/model.yml',
        'test/output/model/src/components/schemas/user-model/models.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );
    await assertSpecCompiled();
  });

  await it('does not overwrite existing files', async () => {
    let files = await cli(toArgv('model user --get --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/user/get.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );
    assert.equal(await readFile('test/output/model/src/components/schemas/user/get.yml', { encoding: 'utf8' }), baseModel);

    const newFile = trimIndent`
      type: "object"
      properties:
        test:
          type: "boolean"
    `;
    await writeFile('test/output/model/src/components/schemas/user/get.yml', newFile, { encoding: 'utf8' });
    assert.equal(await readFile('test/output/model/src/components/schemas/user/get.yml', { encoding: 'utf8' }), newFile);

    files = await cli(toArgv('model user --get --output test/output/model --quiet'));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/model/.boatsrc',
        'test/output/model/src/components/schemas/index.yml',
        'test/output/model/src/components/schemas/user/get.yml',
        'test/output/model/src/components/schemas/user/model.yml',
        'test/output/model/src/index.yml',
      ],
      'files mismatch',
    );

    assert.equal(await readFile('test/output/model/src/components/schemas/user/get.yml', { encoding: 'utf8' }), newFile);
  });
}).catch(console.warn);
