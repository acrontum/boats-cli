import assert from 'node:assert';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { beforeEach, describe, it } from 'node:test';
import { cli } from '../src/cli';
import { trimIndent } from '../src/lib';
import { getBoatsRc, getIndex } from '../src/templates/init';
import { boats } from './boats';
import { baseModel, getAllFiles, getFile, toArgv } from './shared';

describe('path.spec.ts', async () => {
  beforeEach(async () => {
    await rm('test/output/path', { recursive: true, force: true });
  });

  await it('generates paths with correct content', async () => {
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

    const args = toArgv('path users/:userId --post --list --get --delete --patch --put --output test/output/path --quiet');
    let files = await cli(args.concat('--dry-run'));
    await assert.rejects(readdir('test/output/path'));

    files = await cli(args);
    const outputFiles = Object.keys(files).sort();

    assert.deepStrictEqual(
      outputFiles,
      [
        'test/output/path/.boatsrc',
        'test/output/path/src/components/parameters/index.yml',
        'test/output/path/src/components/parameters/pathUserId.yml',
        'test/output/path/src/components/parameters/queryLimit.yml',
        'test/output/path/src/components/parameters/queryOffset.yml',
        'test/output/path/src/components/schemas/index.yml',
        'test/output/path/src/components/schemas/pagination/model.yml',
        'test/output/path/src/components/schemas/user/model.yml',
        'test/output/path/src/components/schemas/user/models.yml',
        'test/output/path/src/components/schemas/user/patch.yml',
        'test/output/path/src/components/schemas/user/post.yml',
        'test/output/path/src/components/schemas/user/put.yml',
        'test/output/path/src/index.yml',
        'test/output/path/src/paths/index.yml',
        'test/output/path/src/paths/users/get.yml',
        'test/output/path/src/paths/users/post.yml',
        'test/output/path/src/paths/users/{userId}/delete.yml',
        'test/output/path/src/paths/users/{userId}/get.yml',
        'test/output/path/src/paths/users/{userId}/patch.yml',
        'test/output/path/src/paths/users/{userId}/put.yml',
      ],
      'files mismatch',
    );

    assert.deepStrictEqual(await getAllFiles('test/output/path'), outputFiles, 'files mismatch');

    assert.equal(
      await getFile('test/output/path/.boatsrc'),
      trimIndent`\
        {
          "picomatchOptions": {
            "bash": true
          },
          "fancyPluralization": true,
          "paths": {}
        }
      `,
    );

    assert.equal(await getFile('test/output/path/src/components/parameters/index.yml'), '{{ autoComponentIndexer() }}\n');

    assert.equal(
      await getFile('test/output/path/src/components/parameters/pathUserId.yml'),
      trimIndent`\
      in: "path"
      name: "userId"
      required: true
      schema:
        type: "string"
      description: "path param that does some stuff"
    `,
    );

    assert.equal(
      await getFile('test/output/path/src/components/parameters/queryLimit.yml'),
      trimIndent`\
        in: "query"
        name: "limit"
        required: false
        schema:
          type: "integer"
        description: "query param that does some stuff"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/components/parameters/queryOffset.yml'),
      trimIndent`\
        in: "query"
        name: "offset"
        required: false
        schema:
          type: "integer"
        description: "query param that does some stuff"
      `,
    );

    assert.equal(await getFile('test/output/path/src/components/schemas/index.yml'), `{{ autoComponentIndexer('Model') }}\n`);

    assert.equal(
      await getFile('test/output/path/src/components/schemas/pagination/model.yml'),
      trimIndent`\
        type: "object"
        required:
          - "offset"
          - "limit"
          - "total"
        properties:
          offset:
            type: "integer"
            minimum: 0
            description: "Starting index"
          limit:
            type: "integer"
            minimum: 0
            description: "Max items returned"
          total:
            type: "integer"
            minimum: 0
            description: "Total items available"
      `,
    );

    assert.equal(await getFile('test/output/path/src/components/schemas/user/model.yml'), baseModel);

    assert.equal(
      await getFile('test/output/path/src/components/schemas/user/models.yml'),
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

    assert.equal(await getFile('test/output/path/src/components/schemas/user/patch.yml'), baseModel);

    assert.equal(await getFile('test/output/path/src/components/schemas/user/post.yml'), baseModel);

    assert.equal(await getFile('test/output/path/src/components/schemas/user/put.yml'), baseModel);

    assert.equal(
      await getFile('test/output/path/src/index.yml'),
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

    assert.equal(await getFile('test/output/path/src/paths/index.yml'), '{{ autoPathIndexer() }}\n');

    assert.equal(
      await getFile('test/output/path/src/paths/users/get.yml'),
      trimIndent`\
        summary: "List users"
        description: "List users"
        responses:
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "../../components/schemas/user/models.yml"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/paths/users/post.yml'),
      trimIndent`\
        summary: "Create a user"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "../../components/schemas/user/post.yml"
        responses:
          "422":
            description: "Invalid user supplied"
          "201":
            description: "Created"
            content:
              application/json:
                schema:
                  $ref: "../../components/schemas/user/model.yml"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/paths/users/{userId}/delete.yml'),
      trimIndent`\
        summary: "Delete user"
        parameters:
          - $ref: "../../../components/parameters/pathUserId.yml"
        responses:
          "404":
            description: "User not found"
          "204":
            description: "Deleted"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/paths/users/{userId}/get.yml'),
      trimIndent`\
        summary: "Show user"
        parameters:
          - $ref: "../../../components/parameters/pathUserId.yml"
        responses:
          "404":
            description: "User not found"
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "../../../components/schemas/user/model.yml"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/paths/users/{userId}/patch.yml'),
      trimIndent`\
        summary: "Update user"
        parameters:
          - $ref: "../../../components/parameters/pathUserId.yml"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "../../../components/schemas/user/patch.yml"
        responses:
          "404":
            description: "User not found"
          "422":
            description: "Invalid user supplied"
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "../../../components/schemas/user/model.yml"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/paths/users/{userId}/put.yml'),
      trimIndent`\
        summary: "Create or replace user"
        parameters:
          - $ref: "../../../components/parameters/pathUserId.yml"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "../../../components/schemas/user/put.yml"
        responses:
          "422":
            description: "Invalid user supplied"
          "201":
            description: "Created"
            content:
              application/json:
                schema:
                  $ref: "../../../components/schemas/user/model.yml"
          "200":
            description: "Replaced"
            content:
              application/json:
                schema:
                  $ref: "../../../components/schemas/user/model.yml"
      `,
    );

    await mkdir('test/output/path/spec/', { recursive: true });
    const indexFile = await boats('test/output/path/src/index.yml', 'test/output/path/spec/api.json');
    assert.strictEqual(indexFile !== '', true, 'boats failed');
    assert.strictEqual(await getFile(indexFile), await getFile('test/fixtures/spec/path.json'), 'spec mismatch');
  });

  await it('accepts deep paths', async () => {
    const args = toArgv('path users/:userId/photos/:photoId -crudl --output test/output/path --quiet');
    let files = await cli(args.concat('--dry-run'));
    await assert.rejects(readdir('test/output/path'));

    files = await cli(args);

    const outputFiles = Object.keys(files).sort();

    assert.deepStrictEqual(
      outputFiles,
      [
        'test/output/path/.boatsrc',
        'test/output/path/src/components/parameters/index.yml',
        'test/output/path/src/components/parameters/pathPhotoId.yml',
        'test/output/path/src/components/parameters/pathUserId.yml',
        'test/output/path/src/components/parameters/queryLimit.yml',
        'test/output/path/src/components/parameters/queryOffset.yml',
        'test/output/path/src/components/schemas/index.yml',
        'test/output/path/src/components/schemas/pagination/model.yml',
        'test/output/path/src/components/schemas/photo/model.yml',
        'test/output/path/src/components/schemas/photo/models.yml',
        'test/output/path/src/components/schemas/photo/patch.yml',
        'test/output/path/src/components/schemas/photo/post.yml',
        'test/output/path/src/index.yml',
        'test/output/path/src/paths/index.yml',
        'test/output/path/src/paths/users/{userId}/photos/get.yml',
        'test/output/path/src/paths/users/{userId}/photos/post.yml',
        'test/output/path/src/paths/users/{userId}/photos/{photoId}/delete.yml',
        'test/output/path/src/paths/users/{userId}/photos/{photoId}/get.yml',
        'test/output/path/src/paths/users/{userId}/photos/{photoId}/patch.yml',
      ],
      'files mismatch',
    );

    assert.deepStrictEqual(await getAllFiles('test/output/path'), outputFiles, 'files mismatch');

    assert.equal(await getFile('test/output/path/.boatsrc'), getBoatsRc());

    assert.equal(await getFile('test/output/path/src/components/parameters/index.yml'), '{{ autoComponentIndexer() }}\n');

    assert.equal(
      await getFile('test/output/path/src/components/parameters/pathPhotoId.yml'),
      trimIndent`\
        in: "path"
        name: "photoId"
        required: true
        schema:
          type: "string"
        description: "path param that does some stuff"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/components/parameters/pathUserId.yml'),
      trimIndent`\
        in: "path"
        name: "userId"
        required: true
        schema:
          type: "string"
        description: "path param that does some stuff"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/components/parameters/queryLimit.yml'),
      trimIndent`\
        in: "query"
        name: "limit"
        required: false
        schema:
          type: "integer"
        description: "query param that does some stuff"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/components/parameters/queryOffset.yml'),
      trimIndent`\
        in: "query"
        name: "offset"
        required: false
        schema:
          type: "integer"
        description: "query param that does some stuff"
      `,
    );

    assert.equal(await getFile('test/output/path/src/components/schemas/index.yml'), "{{ autoComponentIndexer('Model') }}\n");

    assert.equal(
      await getFile('test/output/path/src/components/schemas/pagination/model.yml'),
      trimIndent`\
        type: "object"
        required:
          - "offset"
          - "limit"
          - "total"
        properties:
          offset:
            type: "integer"
            minimum: 0
            description: "Starting index"
          limit:
            type: "integer"
            minimum: 0
            description: "Max items returned"
          total:
            type: "integer"
            minimum: 0
            description: "Total items available"
      `,
    );

    assert.equal(await getFile('test/output/path/src/components/schemas/photo/model.yml'), baseModel);

    assert.equal(
      await getFile('test/output/path/src/components/schemas/photo/models.yml'),
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

    assert.equal(await getFile('test/output/path/src/components/schemas/photo/patch.yml'), baseModel);

    assert.equal(await getFile('test/output/path/src/components/schemas/photo/post.yml'), baseModel);

    assert.equal(await getFile('test/output/path/src/index.yml'), getIndex({}));

    assert.equal(await getFile('test/output/path/src/paths/index.yml'), '{{ autoPathIndexer() }}\n');

    assert.equal(
      await getFile('test/output/path/src/paths/users/{userId}/photos/get.yml'),
      trimIndent`\
        summary: "List photos"
        description: "List photos"
        parameters:
          - $ref: "../../../../components/parameters/pathUserId.yml"
        responses:
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "../../../../components/schemas/photo/models.yml"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/paths/users/{userId}/photos/post.yml'),
      trimIndent`\
        summary: "Create a photo"
        parameters:
          - $ref: "../../../../components/parameters/pathUserId.yml"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "../../../../components/schemas/photo/post.yml"
        responses:
          "422":
            description: "Invalid photo supplied"
          "201":
            description: "Created"
            content:
              application/json:
                schema:
                  $ref: "../../../../components/schemas/photo/model.yml"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/paths/users/{userId}/photos/{photoId}/delete.yml'),
      trimIndent`\
        summary: "Delete photo"
        parameters:
          - $ref: "../../../../../components/parameters/pathUserId.yml"
          - $ref: "../../../../../components/parameters/pathPhotoId.yml"
        responses:
          "404":
            description: "Photo not found"
          "204":
            description: "Deleted"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/paths/users/{userId}/photos/{photoId}/get.yml'),
      trimIndent`\
        summary: "Show photo"
        parameters:
          - $ref: "../../../../../components/parameters/pathUserId.yml"
          - $ref: "../../../../../components/parameters/pathPhotoId.yml"
        responses:
          "404":
            description: "Photo not found"
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "../../../../../components/schemas/photo/model.yml"
      `,
    );

    assert.equal(
      await getFile('test/output/path/src/paths/users/{userId}/photos/{photoId}/patch.yml'),
      trimIndent`\
        summary: "Update photo"
        parameters:
          - $ref: "../../../../../components/parameters/pathUserId.yml"
          - $ref: "../../../../../components/parameters/pathPhotoId.yml"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "../../../../../components/schemas/photo/patch.yml"
        responses:
          "404":
            description: "Photo not found"
          "422":
            description: "Invalid photo supplied"
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "../../../../../components/schemas/photo/model.yml"
      `,
    );

    await mkdir('test/output/path/spec/', { recursive: true });
    const indexFile = await boats('test/output/path/src/index.yml', 'test/output/path/spec/api.json');
    assert.strictEqual(indexFile !== '', true, 'boats failed');
    assert.strictEqual(await getFile(indexFile), await getFile('test/fixtures/spec/path-deep.json'), 'spec mismatch');
  });

  await it('can skip generating models', async () => {
    const args = toArgv('path users/:userId -crudlP --output test/output/path --quiet --dry-run');
    let files = await cli(args);

    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/path/.boatsrc',
        'test/output/path/src/components/parameters/index.yml',
        'test/output/path/src/components/parameters/pathUserId.yml',
        'test/output/path/src/components/parameters/queryLimit.yml',
        'test/output/path/src/components/parameters/queryOffset.yml',
        'test/output/path/src/components/schemas/index.yml',
        'test/output/path/src/components/schemas/pagination/model.yml',
        'test/output/path/src/components/schemas/user/model.yml',
        'test/output/path/src/components/schemas/user/models.yml',
        'test/output/path/src/components/schemas/user/patch.yml',
        'test/output/path/src/components/schemas/user/post.yml',
        'test/output/path/src/components/schemas/user/put.yml',
        'test/output/path/src/index.yml',
        'test/output/path/src/paths/index.yml',
        'test/output/path/src/paths/users/get.yml',
        'test/output/path/src/paths/users/post.yml',
        'test/output/path/src/paths/users/{userId}/delete.yml',
        'test/output/path/src/paths/users/{userId}/get.yml',
        'test/output/path/src/paths/users/{userId}/patch.yml',
        'test/output/path/src/paths/users/{userId}/put.yml',
      ],
      'file mismatch',
    );

    files = await cli(args.concat('--no-models'));

    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/path/.boatsrc',
        'test/output/path/src/index.yml',
        'test/output/path/src/paths/index.yml',
        'test/output/path/src/paths/users/get.yml',
        'test/output/path/src/paths/users/post.yml',
        'test/output/path/src/paths/users/{userId}/delete.yml',
        'test/output/path/src/paths/users/{userId}/get.yml',
        'test/output/path/src/paths/users/{userId}/patch.yml',
        'test/output/path/src/paths/users/{userId}/put.yml',
      ],
      'file mismatch',
    );

    files = await cli(args.concat('--no-models', '--no-init'));

    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/path/src/paths/index.yml',
        'test/output/path/src/paths/users/get.yml',
        'test/output/path/src/paths/users/post.yml',
        'test/output/path/src/paths/users/{userId}/delete.yml',
        'test/output/path/src/paths/users/{userId}/get.yml',
        'test/output/path/src/paths/users/{userId}/patch.yml',
        'test/output/path/src/paths/users/{userId}/put.yml',
      ],
      'file mismatch',
    );
  });
}).catch(console.warn);
