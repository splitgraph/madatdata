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
yarn run yeet --help
```

## Upgrade everything at once, interactively

```bash
yarn up -E -i '*'
```

## Adding a new package

Checklist:

```
- [ ] In `packages` directory, create a new workspace directory
- [ ] In new directory, create `package.json` (copy from another or `yarn init`)
- [ ] In new `package.json`, ensure value of `name` begins with `@madatdata/`
- In main `tsconfig.json`
  - [ ] Add line to `paths` object for new package
  - [ ] If package has build artifacts e.g. `dist`, add to `exclude`
- In main `vitest.config.ts`
  - [ ] Add resolve alias for package
```
