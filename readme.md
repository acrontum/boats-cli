# boats-cli

`boats-cli` is the unofficial CLI for [johndcarmichael/boats](https://github.com/johndcarmichael/boats) which makes it even easier to quickly setup and scaffold the BOATS files in a project.

<p align="center">
  <a href="https://www.npmjs.org/package/@acrontum/boats-cli" alt="npm version @acrontum/boats-cli">
    <img alt="npm version @acrontum/boats-cli" src="https://img.shields.io/npm/v/@acrontum/boats-cli">
  </a>

  <a href="https://github.com/acrontum/boats-cli" alt="Github latest tag acrontum/boats-cli">
    <img alt="Github latest tag acrontum/boats-cli" src="https://img.shields.io/github/v/tag/acrontum/boats-cli">
  </a>

  <img alt="npm minified bundle size" src="https://img.shields.io/bundlephobia/min/@acrontum/boats-cli">

  <br />

  <a href="https://github.com/acrontum/boats-cli/actions/workflows/build-node.yml" alt="CI status (node workflow)">
    <img alt="CI status (node workflow)" src="https://github.com/acrontum/boats-cli/actions/workflows/build-node.yml/badge.svg">
  </a>
</p>

**Early alpha, docs and functionality will change**

<!-- 
npx --yes doctoc --github readme.md
-->
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Quick Start](#quick-start)
- [Development](#development)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Quick Start

```bash
npx @acrontum/boats-cli --help
npx @acrontum/boats-cli path --help
npx @acrontum/boats-cli model --help
npx @acrontum/boats-cli init --help
```

For an empty boats project:

```bash
mkdir backend-spec

cd backend-spec

npm init --yes
# npm i --save-dev boats @acrontum/boats-cli

npx @acrontum/boats-cli \
  path auth/verify --get \
  path auth/login --post \
  path auth/logout --get \
  path auth/refresh-token --get \
  path albums/:albumId --post --get --patch --delete --list \
  path albums/:albumId/songs/:songId -crudl \
  model jwt \
  model search --type query

npx boats -i src/index.yml -o build/api.json
```

optionally, since it's long to type:
```bash
npm i --save-dev @acrontum/boats-cli
```
then you can just run `npx bc model test --dry-run`.


## Development

Configure githooks:
```bash
git config core.hooksPath $(git rev-parse --show-toplevel)/githooks/
```
