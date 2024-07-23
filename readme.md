<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [boats-cli](#boats-cli)
  - [Quick Start](#quick-start)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# boats-cli

`boats-cli` is the unofficial CLI for [johndcarmichael/boats](https://github.com/johndcarmichael/boats).


**Early alhpa, docs and functionality will change**


## Quick Start

```bash
npx @acrontum/boats-cli --help
npx @acrontum/boats-cli path --help
npx @acrontum/boats-cli model --help
```

For an empty boats project:

```bash
mkdir backend-spec

cd backend-spec

npm init --yes

npx @acrontum/boats-cli \
  path auth/verify --get \
  path auth/login --post \
  path auth/logout --get \
  path auth/refresh-token --get \
  path albums/:albumId --post --get --patch --delete --list \
  path albums/:albumId/songs/:songId -crudl \
  model jwt \
  model search --type query

npm i -D boats
npx boats -i src/index.yml -o build/api.json
```

optionally, since it's long to type:
```bash
npm i -D @acrontum/boats-cli
```
then you can then just `npx bc model test --dry-run`.
