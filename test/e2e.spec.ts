import assert from 'node:assert';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { beforeEach, describe, it } from 'node:test';
import { cli, cliArguments } from '../src/cli';
import { trimIndent } from '../src/lib';
import { modelCliArguments } from '../src/subcommands/model';
import { pathCliArguments } from '../src/subcommands/path';
import { boats, ErrorWithLogs } from './boats';
import { getAllFiles, getFile, toArgv } from './shared';

describe('e2e.spec.ts', async () => {
  beforeEach(async () => {
    await rm('test/output/e2e', { recursive: true, force: true });
  });

  await it('initializes a boats project', async () => {
    let files = await cli(toArgv(`init --output test/output/e2e --quiet --dry-run`));
    assert.deepStrictEqual(Object.keys(files).sort(), ['test/output/e2e/.boatsrc', 'test/output/e2e/src/index.yml'], 'file mismatch');

    await assert.rejects(readdir('test/output/e2e'), 'dry run should not create files');
    files = await cli(toArgv(`init --output test/output/e2e --quiet`));
    assert.deepStrictEqual(Object.keys(files).sort(), ['test/output/e2e/.boatsrc', 'test/output/e2e/src/index.yml'], 'file mismatch');

    let content = await readFile('test/output/e2e/.boatsrc', { encoding: 'utf8' });
    assert.equal(
      content,
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

    content = await getFile('test/output/e2e/src/index.yml');
    assert.equal(
      content,
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

    // boats will fail here as the index points to params / schemas that don't exist
    await mkdir('test/output/e2e/spec/', { recursive: true });
    const error = boats('test/output/e2e/src/index.yml', 'test/output/e2e/api.json');
    await assert.rejects(error, 'boats should fail');

    const errorValue = (await error.catch((e: unknown) => e)) as ErrorWithLogs;
    assert.strictEqual(errorValue.code, 'ERESOLVER');
    assert.deepStrictEqual(errorValue.logs, [['Render index file 1st', 'test/output/e2e/src/index.yml'], [undefined]]);

    files = await cli(toArgv(`init --all --output test/output/e2e --quiet`));
    assert.deepStrictEqual(
      Object.keys(files).sort(),
      [
        'test/output/e2e/.boatsrc',
        'test/output/e2e/src/components/parameters/index.yml',
        'test/output/e2e/src/components/schemas/index.yml',
        'test/output/e2e/src/index.yml',
        'test/output/e2e/src/paths/index.yml',
      ],
      'file mismatch',
    );

    await mkdir('test/output/e2e/spec/', { recursive: true });
    const indexFile = await boats('test/output/e2e/src/index.yml', 'test/output/e2e/api.json');
    assert.strictEqual(indexFile !== '', true, 'boats failed');
    assert.strictEqual(await getFile(indexFile), await getFile('test/fixtures/spec/init.json'), 'spec mismatch');
  });

  await it('generates files - album api', async () => {
    const e2eFiles = [
      'test/output/e2e/gen1/.boatsrc',
      'test/output/e2e/gen1/src/components/parameters/index.yml',
      'test/output/e2e/gen1/src/components/parameters/pathAlbumId.yml',
      'test/output/e2e/gen1/src/components/parameters/pathSongId.yml',
      'test/output/e2e/gen1/src/components/parameters/queryLimit.yml',
      'test/output/e2e/gen1/src/components/parameters/queryOffset.yml',
      'test/output/e2e/gen1/src/components/schemas/album/model.yml',
      'test/output/e2e/gen1/src/components/schemas/album/models.yml',
      'test/output/e2e/gen1/src/components/schemas/artist/model.yml',
      'test/output/e2e/gen1/src/components/schemas/index.yml',
      'test/output/e2e/gen1/src/components/schemas/jwt/model.yml',
      'test/output/e2e/gen1/src/components/schemas/login/model.yml',
      'test/output/e2e/gen1/src/components/schemas/login/post.yml',
      'test/output/e2e/gen1/src/components/schemas/pagination/model.yml',
      'test/output/e2e/gen1/src/components/schemas/refresh-token/model.yml',
      'test/output/e2e/gen1/src/components/schemas/song/model.yml',
      'test/output/e2e/gen1/src/components/schemas/song/models.yml',
      'test/output/e2e/gen1/src/components/schemas/song/patch.yml',
      'test/output/e2e/gen1/src/components/schemas/song/post.yml',
      'test/output/e2e/gen1/src/components/schemas/verify/model.yml',
      'test/output/e2e/gen1/src/index.yml',
      'test/output/e2e/gen1/src/paths/albums/get.yml',
      'test/output/e2e/gen1/src/paths/albums/{albumId}/get.yml',
      'test/output/e2e/gen1/src/paths/albums/{albumId}/songs/get.yml',
      'test/output/e2e/gen1/src/paths/albums/{albumId}/songs/post.yml',
      'test/output/e2e/gen1/src/paths/albums/{albumId}/songs/{songId}/delete.yml',
      'test/output/e2e/gen1/src/paths/albums/{albumId}/songs/{songId}/get.yml',
      'test/output/e2e/gen1/src/paths/albums/{albumId}/songs/{songId}/patch.yml',
      'test/output/e2e/gen1/src/paths/auth/login/post.yml',
      'test/output/e2e/gen1/src/paths/auth/refresh-token/get.yml',
      'test/output/e2e/gen1/src/paths/auth/verify/get.yml',
      'test/output/e2e/gen1/src/paths/index.yml',
    ];

    const args = toArgv(`
      path auth/verify --get
      path auth/login --post
      path auth/refresh-token --get
      path albums/:albumId --list --get
      path albums/:albumId/songs/:songId -crudl
      model jwt
      model artist
      --quiet
      --output test/output/e2e/gen1
    `);

    let files = await cli(args.concat('--dry-run'));
    assert.deepStrictEqual(Object.keys(files).sort(), e2eFiles, 'file mismatch');
    await assert.rejects(readdir('test/output/e2e/gen1'), 'dry run should not create files');

    files = await cli(args);
    const filenames = Object.keys(files).sort();
    assert.deepStrictEqual(filenames, e2eFiles, 'file mismatch');

    const fixtures = await getAllFiles('test/fixtures/e2e/gen1');
    assert.deepStrictEqual(
      fixtures.map((fixture) => fixture.replace('test/fixtures/e2e/gen1', 'test/output/e2e/gen1')),
      filenames,
      'file mismatch',
    );

    for (const fixtureFile of fixtures) {
      const outputFile = fixtureFile.replace('test/fixtures/e2e/gen1', 'test/output/e2e/gen1');
      assert.strictEqual(await getFile(outputFile), await getFile(fixtureFile));
    }

    await mkdir('test/output/e2e/spec/', { recursive: true });
    const indexFile = await boats('test/output/e2e/gen1/src/index.yml', 'test/output/e2e/api.json');
    assert.strictEqual(indexFile !== '', true, 'boats failed');
    assert.strictEqual(await getFile(indexFile), await getFile('test/fixtures/spec/album-api.json'), 'spec mismatch');
  });

  await it('generates files - user api', async () => {
    const e2eFiles = [
      'test/output/e2e/gen2/.boatsrc',
      'test/output/e2e/gen2/src/components/parameters/index.yml',
      'test/output/e2e/gen2/src/components/parameters/pathAddresseId.yml',
      'test/output/e2e/gen2/src/components/parameters/pathUserId.yml',
      'test/output/e2e/gen2/src/components/parameters/queryLimit.yml',
      'test/output/e2e/gen2/src/components/parameters/queryOffset.yml',
      'test/output/e2e/gen2/src/components/schemas/address/model.yml',
      'test/output/e2e/gen2/src/components/schemas/address/models.yml',
      'test/output/e2e/gen2/src/components/schemas/address/post.yml',
      'test/output/e2e/gen2/src/components/schemas/index.yml',
      'test/output/e2e/gen2/src/components/schemas/jwt/model.yml',
      'test/output/e2e/gen2/src/components/schemas/login/model.yml',
      'test/output/e2e/gen2/src/components/schemas/login/post.yml',
      'test/output/e2e/gen2/src/components/schemas/logout/model.yml',
      'test/output/e2e/gen2/src/components/schemas/pagination/model.yml',
      'test/output/e2e/gen2/src/components/schemas/user-verification/model.yml',
      'test/output/e2e/gen2/src/components/schemas/user/model.yml',
      'test/output/e2e/gen2/src/components/schemas/user/models.yml',
      'test/output/e2e/gen2/src/components/schemas/user/patch.yml',
      'test/output/e2e/gen2/src/components/schemas/user/post.yml',
      'test/output/e2e/gen2/src/index.yml',
      'test/output/e2e/gen2/src/paths/auth/login/post.yml',
      'test/output/e2e/gen2/src/paths/auth/logout/get.yml',
      'test/output/e2e/gen2/src/paths/auth/verify/get.yml',
      'test/output/e2e/gen2/src/paths/index.yml',
      'test/output/e2e/gen2/src/paths/users/get.yml',
      'test/output/e2e/gen2/src/paths/users/post.yml',
      'test/output/e2e/gen2/src/paths/users/{userId}/addresses/get.yml',
      'test/output/e2e/gen2/src/paths/users/{userId}/addresses/post.yml',
      'test/output/e2e/gen2/src/paths/users/{userId}/addresses/{addresseId}/delete.yml',
      'test/output/e2e/gen2/src/paths/users/{userId}/addresses/{addresseId}/get.yml',
      'test/output/e2e/gen2/src/paths/users/{userId}/delete.yml',
      'test/output/e2e/gen2/src/paths/users/{userId}/get.yml',
      'test/output/e2e/gen2/src/paths/users/{userId}/patch.yml',
    ];

    const args = toArgv(`
      path /auth/verify --get --model userVerification
      path /auth/login --post
      path /auth/logout --get
      path /users/:userId -crudl
      path /users/:userId/addresses/:addresseId --list --get --delete --post
      model jwt
      --quiet
      --output test/output/e2e/gen2
    `);

    let files = await cli(args.concat('--dry-run'));
    assert.deepStrictEqual(Object.keys(files).sort(), e2eFiles, 'file mismatch');
    await assert.rejects(readdir('test/output/e2e/gen2'), 'dry run should not create files');

    files = await cli(args);
    const filenames = Object.keys(files).sort();
    assert.deepStrictEqual(filenames, e2eFiles, 'file mismatch');

    const fixtures = await getAllFiles('test/fixtures/e2e/gen2');
    assert.deepStrictEqual(
      fixtures.map((fixture) => fixture.replace('test/fixtures/e2e/gen2', 'test/output/e2e/gen2')),
      filenames,
      'file mismatch',
    );

    for (const fixtureFile of fixtures) {
      const outputFile = fixtureFile.replace('test/fixtures/e2e/gen2', 'test/output/e2e/gen2');
      assert.strictEqual(await getFile(outputFile), await getFile(fixtureFile));
    }

    await mkdir('test/output/e2e/spec/', { recursive: true });
    const indexFile = await boats('test/output/e2e/gen2/src/index.yml', 'test/output/e2e/api.json');
    assert.strictEqual(indexFile !== '', true, 'boats failed');
    assert.strictEqual(await getFile(indexFile), await getFile('test/fixtures/spec/user-api.json'), 'spec mismatch');
  });

  await it('should not have global short and long opt conflicts with subcommands', () => {
    const globalKeys = new Set(Object.keys(cliArguments));
    globalKeys.delete('help');
    const globalShortKeys = new Set([...globalKeys.values()].map((key) => cliArguments[key].short || '_delete_'));
    globalShortKeys.delete('_delete_');

    const pathKeys = new Set(Object.keys(pathCliArguments));
    pathKeys.delete('help');
    const pathShortKeys = new Set([...pathKeys.values()].map((key) => pathCliArguments[key].short || '_delete_'));
    pathShortKeys.delete('_delete_');

    const modelKeys = new Set(Object.keys(modelCliArguments));
    modelKeys.delete('help');
    const modelShortKeys = new Set([...modelKeys.values()].map((key) => modelCliArguments[key].short || '_delete_'));
    modelShortKeys.delete('_delete_');

    const longPathConflicts = [...globalKeys.values()].find((k) => pathKeys.has(k));
    const shortPathConflicts = [...globalShortKeys.values()].find((k) => pathShortKeys.has(k));
    assert.strictEqual(longPathConflicts, undefined, 'cli conflict with path args');
    assert.strictEqual(shortPathConflicts, undefined, 'cli conflict with path args');

    const longModelConflicts = [...globalKeys.values()].find((k) => modelKeys.has(k));
    const shortModelConflicts = [...globalShortKeys.values()].find((k) => modelShortKeys.has(k));
    assert.strictEqual(longModelConflicts, undefined, 'cli conflict with model args');
    assert.strictEqual(shortModelConflicts, undefined, 'cli conflict with model args');
  });

  await it('can generate files using custom root schema ref', async () => {
    const allFiles = [
      'test/output/e2e/root-ref/.boatsrc',
      'test/output/e2e/root-ref/src/components/parameters/index.yml',
      'test/output/e2e/root-ref/src/components/parameters/pathPhotoId.yml',
      'test/output/e2e/root-ref/src/components/parameters/pathUserId.yml',
      'test/output/e2e/root-ref/src/components/parameters/queryLimit.yml',
      'test/output/e2e/root-ref/src/components/parameters/queryOffset.yml',
      'test/output/e2e/root-ref/src/components/schemas/index.yml',
      'test/output/e2e/root-ref/src/components/schemas/pagination/model.yml',
      'test/output/e2e/root-ref/src/components/schemas/photo/model.yml',
      'test/output/e2e/root-ref/src/components/schemas/photo/models.yml',
      'test/output/e2e/root-ref/src/components/schemas/photo/patch.yml',
      'test/output/e2e/root-ref/src/components/schemas/photo/post.yml',
      'test/output/e2e/root-ref/src/components/schemas/user/model.yml',
      'test/output/e2e/root-ref/src/components/schemas/user/models.yml',
      'test/output/e2e/root-ref/src/components/schemas/user/patch.yml',
      'test/output/e2e/root-ref/src/components/schemas/user/post.yml',
      'test/output/e2e/root-ref/src/index.yml',
      'test/output/e2e/root-ref/src/paths/index.yml',
      'test/output/e2e/root-ref/src/paths/users/get.yml',
      'test/output/e2e/root-ref/src/paths/users/post.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/delete.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/get.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/patch.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/get.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/post.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/delete.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/get.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/patch.yml',
    ];
    const args = 'path users/:userId -crudl path users/:userId/photos/:photoId -crudl --quiet --output test/output/e2e/root-ref ';

    const files = await cli(toArgv(args + ' --root-ref=Model'));
    assert.deepStrictEqual(Object.keys(files).sort(), allFiles, 'file mismatch');

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/components/schemas/photo/models.yml'),
      trimIndent`\
        type: "object"
        required:
          - "meta"
          - "data"
        properties:
          meta:
            $ref: "#/components/Pagination"
          data:
            type: "array"
            items:
              $ref: "./model.yml"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/components/schemas/user/models.yml'),
      trimIndent`\
        type: "object"
        required:
          - "meta"
          - "data"
        properties:
          meta:
            $ref: "#/components/Pagination"
          data:
            type: "array"
            items:
              $ref: "./model.yml"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/get.yml'),
      trimIndent`\
        summary: "List users"
        description: "List users"
        responses:
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/Users"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/post.yml'),
      trimIndent`\
        summary: "Create a user"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserPost"
        responses:
          "422":
            description: "Invalid user supplied"
          "201":
            description: "Created"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/User"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/get.yml'),
      trimIndent`\
        summary: "Show user"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
        responses:
          "404":
            description: "User not found"
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/User"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/patch.yml'),
      trimIndent`\
        summary: "Update user"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserPatch"
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
                  $ref: "#/components/schemas/User"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/photos/get.yml'),
      trimIndent`\
        summary: "List photos"
        description: "List photos"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
        responses:
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/Photos"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/photos/post.yml'),
      trimIndent`\
        summary: "Create a photo"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PhotoPost"
        responses:
          "422":
            description: "Invalid photo supplied"
          "201":
            description: "Created"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/Photo"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/get.yml'),
      trimIndent`\
        summary: "Show photo"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
          - $ref: "#/components/parameters/PathPhotoId"
        responses:
          "404":
            description: "Photo not found"
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/Photo"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/patch.yml'),
      trimIndent`\
        summary: "Update photo"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
          - $ref: "#/components/parameters/PathPhotoId"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PhotoPatch"
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
                  $ref: "#/components/schemas/Photo"
      `,
      'wrong root ref output',
    );
  });

  await it('can generate files using custom root schema ref which does not exist, or is empty (-)', async () => {
    const allFiles = [
      'test/output/e2e/root-ref/.boatsrc',
      'test/output/e2e/root-ref/src/components/parameters/index.yml',
      'test/output/e2e/root-ref/src/components/parameters/pathPhotoId.yml',
      'test/output/e2e/root-ref/src/components/parameters/pathUserId.yml',
      'test/output/e2e/root-ref/src/components/parameters/queryLimit.yml',
      'test/output/e2e/root-ref/src/components/parameters/queryOffset.yml',
      'test/output/e2e/root-ref/src/components/schemas/index.yml',
      'test/output/e2e/root-ref/src/components/schemas/pagination/model.yml',
      'test/output/e2e/root-ref/src/components/schemas/photo/model.yml',
      'test/output/e2e/root-ref/src/components/schemas/photo/models.yml',
      'test/output/e2e/root-ref/src/components/schemas/photo/patch.yml',
      'test/output/e2e/root-ref/src/components/schemas/photo/post.yml',
      'test/output/e2e/root-ref/src/components/schemas/user/model.yml',
      'test/output/e2e/root-ref/src/components/schemas/user/models.yml',
      'test/output/e2e/root-ref/src/components/schemas/user/patch.yml',
      'test/output/e2e/root-ref/src/components/schemas/user/post.yml',
      'test/output/e2e/root-ref/src/index.yml',
      'test/output/e2e/root-ref/src/paths/index.yml',
      'test/output/e2e/root-ref/src/paths/users/get.yml',
      'test/output/e2e/root-ref/src/paths/users/post.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/delete.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/get.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/patch.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/get.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/post.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/delete.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/get.yml',
      'test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/patch.yml',
    ];
    const args = 'path users/:userId -crudl path users/:userId/photos/:photoId -crudl --quiet --output test/output/e2e/root-ref ';

    const files = await cli(toArgv(args + ' --root-ref=Blah'));
    assert.deepStrictEqual(Object.keys(files).sort(), allFiles, 'file mismatch');

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/components/schemas/photo/models.yml'),
      trimIndent`\
        type: "object"
        required:
          - "meta"
          - "data"
        properties:
          meta:
            $ref: "#/components/PaginationModel"
          data:
            type: "array"
            items:
              $ref: "./model.yml"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/components/schemas/user/models.yml'),
      trimIndent`\
        type: "object"
        required:
          - "meta"
          - "data"
        properties:
          meta:
            $ref: "#/components/PaginationModel"
          data:
            type: "array"
            items:
              $ref: "./model.yml"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/get.yml'),
      trimIndent`\
        summary: "List users"
        description: "List users"
        responses:
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/UserModels"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/post.yml'),
      trimIndent`\
        summary: "Create a user"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserPost"
        responses:
          "422":
            description: "Invalid user supplied"
          "201":
            description: "Created"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/UserModel"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/get.yml'),
      trimIndent`\
        summary: "Show user"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
        responses:
          "404":
            description: "User not found"
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/UserModel"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/patch.yml'),
      trimIndent`\
        summary: "Update user"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserPatch"
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
                  $ref: "#/components/schemas/UserModel"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/photos/get.yml'),
      trimIndent`\
        summary: "List photos"
        description: "List photos"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
        responses:
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/PhotoModels"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/photos/post.yml'),
      trimIndent`\
        summary: "Create a photo"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PhotoPost"
        responses:
          "422":
            description: "Invalid photo supplied"
          "201":
            description: "Created"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/PhotoModel"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/get.yml'),
      trimIndent`\
        summary: "Show photo"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
          - $ref: "#/components/parameters/PathPhotoId"
        responses:
          "404":
            description: "Photo not found"
          "200":
            description: "Success"
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/PhotoModel"
      `,
      'wrong root ref output',
    );

    assert.deepStrictEqual(
      await getFile('test/output/e2e/root-ref/src/paths/users/{userId}/photos/{photoId}/patch.yml'),
      trimIndent`\
        summary: "Update photo"
        parameters:
          - $ref: "#/components/parameters/PathUserId"
          - $ref: "#/components/parameters/PathPhotoId"
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PhotoPatch"
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
                  $ref: "#/components/schemas/PhotoModel"
      `,
      'wrong root ref output',
    );
  });

  await it('can generate files using disabled root schema ref', async () => {
    // if the other test is passing (-R 'Blah'), this should have the same effect as disabling root ref
    // except for the param passed into component indexer
    const baseFiles = await cli(
      toArgv(`
      path users/:userId -crudl
      path users/:userId/photos/:photoId -crudl
      --quiet
      --output test/output/e2e/root-ref-base
      --root-ref=Blah
    `),
    );

    const allFiles = Object.keys(baseFiles)
      .map((file) => file.replace('/root-ref-base/', '/root-ref-off/'))
      .sort();
    assert.strictEqual(await getFile('test/output/e2e/root-ref-base/src/components/schemas/index.yml'), "{{ autoComponentIndexer('Blah') }}\n");
    await writeFile('test/output/e2e/root-ref-base/src/components/schemas/index.yml', '{{ autoComponentIndexer() }}\n', { encoding: 'utf8' });

    const args = 'path users/:userId -crudl path users/:userId/photos/:photoId -crudl --quiet --output test/output/e2e/root-ref-off ';

    let files = await cli(toArgv(args + ' --root-ref=-'));
    assert.deepStrictEqual(Object.keys(files).sort(), allFiles, 'file mismatch');
    for (const file of allFiles) {
      assert.strictEqual(await getFile(file.replace('/root-ref-off/', '/root-ref-base/')), await getFile(file), 'content mismatch');
    }

    files = await cli(toArgv(args + ' -R-'));
    assert.deepStrictEqual(Object.keys(files).sort(), allFiles, 'file mismatch');
    for (const file of allFiles) {
      assert.strictEqual(await getFile(file.replace('/root-ref-off/', '/root-ref-base/')), await getFile(file), 'content mismatch');
    }
  });
}).catch(console.warn);
