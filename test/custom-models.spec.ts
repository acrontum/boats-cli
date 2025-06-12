import assert from 'node:assert';
import { rm } from 'node:fs/promises';
import { beforeEach, describe, it } from 'node:test';
import { cli, CliExit, GlobalOptions } from '../src/cli';
import { generate } from '../src/generate';
import { getBoatsRc, getIndex } from '../src/templates/init';
import { getModel, getModels } from '../src/templates/model';
import { boats, mockConsoleLog } from './boats';
import { getAllFiles, getFile, toArgv } from './shared';

describe('custom-models.spec.ts', async () => {
  beforeEach(async () => {
    await rm('test/output/custom', { recursive: true, force: true });
  });

  await it('can load custom models', async () => {
    await cli(
      toArgv(`
        path auth/verify --get
        path auth/login --post
        path auth/refresh-token --get
        path albums/:albumId --list --get
        path albums/:albumId/songs/:songId -crudl
        model jwt
        model artist
        --quiet
        --output test/output/custom
        --templates test/fixtures/overrides
    `),
    );

    const indexFile = await boats('test/output/custom/src/index.yml', 'test/output/custom/api.json');

    assert.strictEqual(indexFile !== '', true, 'boats failed');
    assert.strictEqual(await getFile(indexFile), await getFile('test/fixtures/spec/custom.json'), 'spec mismatch');
  });

  await it('can disable custom model output by returning a falsey value', async () => {
    const globalOptions: GlobalOptions = {
      quiet: true,
      output: 'test/output/custom',
      customTemplates: {
        getModel: (): string => '',
        getModels: (): string => '',
      },
    };

    const files = await generate(
      [
        {
          contents: (): string => getModels(globalOptions, `src/components/schemas/something/models.yml`, '#/components/schemas/Pagination'),
          filename: `src/components/schemas/something/models.yml`,
        },
        {
          contents: (): string => getModel(globalOptions, 'src/components/schemas/something/model.yml'),
          filename: 'src/components/schemas/something/model.yml',
        },
        { contents: (): string => getIndex(globalOptions, 'src/index.yml'), filename: 'src/index.yml' },
        { contents: (): string => getBoatsRc(globalOptions, '.boatsrc'), filename: '.boatsrc' },
      ],
      globalOptions,
    );

    assert.deepStrictEqual(
      JSON.stringify(Object.entries(files).sort(([a], [b]) => b.localeCompare(a))),
      JSON.stringify([
        ['test/output/custom/src/index.yml', { filename: 'test/output/custom/src/index.yml' }],
        [
          'test/output/custom/src/components/schemas/something/models.yml',
          { filename: 'test/output/custom/src/components/schemas/something/models.yml', skipped: true },
        ],
        [
          'test/output/custom/src/components/schemas/something/model.yml',
          { filename: 'test/output/custom/src/components/schemas/something/model.yml', skipped: true },
        ],
        ['test/output/custom/src/components/schemas/index.yml', { filename: 'test/output/custom/src/components/schemas/index.yml' }],
        ['test/output/custom/.boatsrc', { filename: 'test/output/custom/.boatsrc' }],
      ]),
    );

    assert.deepStrictEqual(await getAllFiles('test/output/custom/'), [
      'test/output/custom/.boatsrc',
      'test/output/custom/src/components/schemas/index.yml',
      'test/output/custom/src/index.yml',
    ]);
  });

  await it('can load all overrides from a module', async () => {
    assert.deepStrictEqual(await getAllFiles('test/output/custom/').catch(() => []), []);

    await cli(
      toArgv(`
        path users/:userId -crudl --put
        model jwt
        model userId --type query
        --quiet
        --output test/output/custom
        -T test/fixtures/overrides/module.js
    `),
    );

    const files = await getAllFiles('test/output/custom/');
    assert.deepStrictEqual(files, [
      'test/output/custom/.boatsrc',
      'test/output/custom/src/components/parameters/index.yml',
      'test/output/custom/src/components/parameters/pathUserId.yml',
      'test/output/custom/src/components/parameters/queryLimit.yml',
      'test/output/custom/src/components/parameters/queryOffset.yml',
      'test/output/custom/src/components/parameters/queryUserId.yml',
      'test/output/custom/src/components/schemas/index.yml',
      'test/output/custom/src/components/schemas/jwt/model.yml',
      'test/output/custom/src/components/schemas/pagination/model.yml',
      'test/output/custom/src/components/schemas/user/model.yml',
      'test/output/custom/src/components/schemas/user/models.yml',
      'test/output/custom/src/components/schemas/user/patch.yml',
      'test/output/custom/src/components/schemas/user/post.yml',
      'test/output/custom/src/components/schemas/user/put.yml',
      'test/output/custom/src/index.yml',
      'test/output/custom/src/paths/index.yml',
      'test/output/custom/src/paths/users/get.yml',
      'test/output/custom/src/paths/users/post.yml',
      'test/output/custom/src/paths/users/{userId}/delete.yml',
      'test/output/custom/src/paths/users/{userId}/get.yml',
      'test/output/custom/src/paths/users/{userId}/patch.yml',
      'test/output/custom/src/paths/users/{userId}/put.yml',
    ]);

    for (const file of await getAllFiles('test/output/custom/')) {
      assert.deepStrictEqual(await getFile(file), file.replace('test/output/custom/', ''));
    }
  });

  await it('outputs a meaningful error message', async () => {
    let log = mockConsoleLog();
    let error = await cli(
      toArgv(`
        path users/:userId -crudl --put
        model jwt
        model userId --type query
        --quiet
        --output test/output/custom
        -T something-that-doesnt-exist
    `),
    ).catch((e: unknown) => e);
    log.unmock();

    assert.strictEqual(error instanceof CliExit, true);
    assert.deepStrictEqual(log.logs, [['cannot load templates "something-that-doesnt-exist": not a module\n'], log.logs[1]]);

    log = mockConsoleLog();
    error = await cli(
      toArgv(`
        path users/:userId -crudl --put
        model jwt
        model userId --type query
        --quiet
        --output test/output/custom
        -T test/fixtures/spec
    `),
    ).catch((e: unknown) => e);
    log.unmock();

    assert.strictEqual(error instanceof CliExit, true);
    assert.deepStrictEqual(log.logs, [['cannot load templates "test/fixtures/spec": template folder has no override files\n'], log.logs[1]]);

    log = mockConsoleLog();
    error = await cli(
      toArgv(`
        path users/:userId -crudl --put
        model jwt
        model userId --type query
        --quiet
        --output test/output/custom
        -T test/fixtures/overrides/boats-rc.js
    `),
    ).catch((e: unknown) => e);
    log.unmock();

    assert.strictEqual(error instanceof CliExit, true);
    assert.deepStrictEqual(log.logs, [
      ['cannot load templates "test/fixtures/overrides/boats-rc.js": module has no override exports\n'],
      log.logs[1],
    ]);
  });
}).catch(console.error);
