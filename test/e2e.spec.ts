import assert from 'node:assert';
import { readdir, readFile, rm } from 'node:fs/promises';
import { beforeEach, describe, it } from 'node:test';
import { cli, cliArguments } from '../src/cli';
import { trimIndent } from '../src/lib';
import { modelCliArguments } from '../src/subcommands/model';
import { pathCliArguments } from '../src/subcommands/path';
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

    content = await readFile('test/output/e2e/src/index.yml', { encoding: 'utf8' });
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
      assert.strictEqual(await getFile(fixtureFile), await getFile(outputFile));
    }
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
      assert.strictEqual(await getFile(fixtureFile), await getFile(outputFile));
    }
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
    assert.strictEqual(typeof longPathConflicts, 'undefined', 'cli conflict with path args');
    assert.strictEqual(typeof shortPathConflicts, 'undefined', 'cli conflict with path args');

    const longModelConflicts = [...globalKeys.values()].find((k) => modelKeys.has(k));
    const shortModelConflicts = [...globalShortKeys.values()].find((k) => modelShortKeys.has(k));
    assert.strictEqual(typeof longModelConflicts, 'undefined', 'cli conflict with model args');
    assert.strictEqual(typeof shortModelConflicts, 'undefined', 'cli conflict with model args');
  });
}).catch(console.warn);
