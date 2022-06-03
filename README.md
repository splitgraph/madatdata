# Setup

## Install

```bash
yarn set version berry
yarn install --immutable
```

If you need to setup `nvm`, make sure that you install `yarn` after creating a
new version of node:

```bash
nvm install
nvm use
npm install -g yarn
```

or try this, to
[migrate global packages](https://github.com/nvm-sh/nvm#migrating-global-packages-while-installing)
while installing:

```
nvm install --reinstall-packages-from=current
```

## Run

Main CLI:

```bash
yarn run scripts --help
```

## Upgrade everything at once, interactively

```bash
yarn up -E -i '*'
```
