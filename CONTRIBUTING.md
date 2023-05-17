# Contributing

## Development workflow

### Install

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

or try this, to [migrate global packages][github-nvm-migrate-global-packages]
while installing:

```
nvm install --reinstall-packages-from=current
```

### Run (test)

This repo is designed for test-driven development. As such, to run all tests in
watch mode, simply run:

```
yarn test
```

Any test that contacts any "real" resource should only run if `INTEGRATION=1`,
so create a file `.env.integration.local` to hold any env keys:

```ini
VITE_TEST_INTEGRATION=1
VITE_TEST_DDN_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_TEST_DDN_API_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
VITE_TEST_SEAFOWL_SECRET=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
VITE_TEST_GITHUB_PAT=uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu
VITE_TEST_SEAFOWL_EXPORT_DEST_URL=https://demo.seafowl.cloud
# should match the username associated with the API_KEY for Splitgraph
VITE_TEST_SEAFOWL_EXPORT_DEST_DBNAME=miles
VITE_TEST_SEAFOWL_EXPORT_DEST_SECRET=tttttttttttttttttttttttttttttttt
```

Then simply append `--mode integration` flag to any variant of `yarn test` that
is running `vitest`, which will then load the environment variables from the
`.env.integration.local` file, if it exsits, and make them available in
`import.meta.env` (e.g. for use in `skipIf` of integration tests).

Note: The tests are written so that this will _include_ integration tests, but
it will not _only_ run integration tests.

### Run tests (other examples)

Run integration tests with filters `client-http` and `client-postgres`, which
will match tests in files `client-http.test.ts` and `client-postgres.test.ts`

```bash
yarn test --mode integration client-http client-postgres
```

Run integration tests with `test-mitm` to proxy to (default) `localhost:7979`,
where a separate process like `mitmproxy` can intercept outbound requests:

```bash
yarn test-mitm --mode integration
```

### Run tests in VSCode "JavaScript Debug Terminal"

If using VSCode, the easiest debugging method is to open a "JavaScript Debug
Terminal" (which you can do via the command palette
"`Debug: JavaScript Debug Terminal`"). Put a `debugger;` statement where you
want to break, and then run vitest in single-threaded mode:

```bash
yarn test --single-thread
```

Or, if you also want to use mitmproxy (assumed to be listening on port `7979`),
then:

```bash
yarn test-mitm --single-thread
```

### Typecheck

We use `tsc` for typechecking, with the default solution file `tsconfig.json`
which emits only declaration files into `dist`. This should be sufficient for
editor integration and command line typechecking:

```
yarn typecheck
```

### Build

We use [`tsc-multi`][tsc-multi] to build packages for multiple targets, from the
root solution file of `tsconfig.build.json`, with build destination of
`packages/*/build/{target}/*`.

```
yarn build
```

### Clean

Clean artifacts in `dist` (generated from `yarn typecheck`) and
`packages/*/build` (generated from `yarn build`):

```
yarn clean
```

### Final check before commit

This is a convenience script which will run the equivalent checks that the CI
pipeline will run.

```
yarn check
```

## Upgrade everything at once, interactively

```bash
yarn up -E -i '*'
```

## Running Scripts

Scripts are installed in the `scripts` workspace and can be run with `yarn zx`
from the root workspace or from within the `scripts` workspace. For example,
from the root:

```bash
yarn zx scripts/print-cwd.ts
```

or from `scripts`:

```bash
cd scripts
yarn zx print-cwd.ts
```

Note that this does not use `yarn workspace` and therefore does not change the
CWD, so the **CWD will be your current directory when running the script**
(i.e., the root of the repository if you're running it from there). See
[`./package.json`](./package.json) for details.

See [`./scripts/README.md`](./scripts/README.md) for more details.

## Publish

tl;dr

```bash
yarn clean
yarn build
yarn version-all patch -i
git add packages/*/package.json
git commit -m "Bump versions for publish"
rm -rf .yarn/versions
yarn publish-all --otp <your otp>
```

**NOTE!** Make sure you've built the latest first with `yarn build` (which can
technically be done after `yarn version-all`, but must be done before
`yarn publish-all`. It's probably also smart to start with `yarn clean`)

Running `yarn version-all` or `yarn publish-all` will run the corresponding
`yarn version` or `yarn publish` command within each workspace where it is
defined, in topological order. Therefore, to indicate a workspace is
publishable, make sure the `package.json` includes `scripts.version` and
`scripts.publish`.

Create deferred patch (0.0.x) changes (if necessary) in topological order

(NOTE: To update all versions immediately, change `-d` to `-i`, and then there
is no need to do the next step of `apply`. This will also create an `undecided`
deferred version file in `.yarn/versions` which you can safely delete by running
`rm -rf .yarn/versions` (check the dir first, of course)):

```
yarn version-all patch -d
```

Apply the version changes (remove `--dry-run` when ready):

```
yarn version apply --all --dry-run
```

Publish the changes

```
yarn publish-all --otp <your otp>
```

Note: If `publish-all` takes more than 30 seconds, the OTP could expire. It's
currently unknown what will happen in this case, but it could break this script,
in which case dropping the `--otp` might be sufficient for it to prompt on each.

When you're done publishing, you probably want to update the examples to use the
latest packages from npm. To do that, run:

```
./build-examples-from-npm.sh
```

## Verdaccio - First time setup

Start it

```
yarn verdaccio --config ./verdaccio.yaml
```

Login for first time. Choose any username/password. The credential will be
persisted to `.verdaccio/htpasswd` for authenticating subsequent login attempts.

```
yarn npm login --publish
```

Reset it (clear the storage)

```
yarn rimraf '.verdaccio/storage/*' '!.verdaccio/storage/.gitkeep'
```

Publish to it. You probably want `--tolerate-republish`, if you're iterating on
a local package registry for some reason an don't want to keep bumping the
version. No scripts in this repository include publish flags by default, so you
will need to provide it:

```
yarn with-verdaccio publish-all --tolerate-republish
```

Note: Prefix any `yarn` command with `yarn with-verdaccio` to run it with the
environment variable `VERDACCIO=http://localhost:4873`, which gets interpolated
into the necessary config settings in `.yarnrc.yml`, and otherwise defaults to
`https://registry.yarnpkg.com`.

## Verdaccio - Further instructions

See [./examples/README.md](./examples/README.md) for details on using Verdaccio
and for a command to

# Appendix

## Alternative Names

- Madatdata
- DSX
- DDX

# Patching Process

See also [patching gotchas][patching-gotchas] (blog post)

In other package (assuming Yarn 1):

```
yarn pack --prod --frozen-lockfile --verbose
```

In this package, run `yarn patch` and note the created directory:

```
yarn patch
```

for example and ease of reference, saving it to a variable:

```
export patch_dir="/private/var/folders/np/djbv9lnn5wd62yrs60zxh_p40000gn/T/xfs-1aff2a96/user"
# (also, note sibling dirs `user` and `patch`, which Yarn will use to compute diff)
```

move built tarball output from first step

```
tar xf msw-v0.45.0.tgz && rm -rf "$patch_dir" && mv package "$patch_dir"
```

---

[github-nvm-migrate-global-packages]:
  https://github.com/nvm-sh/nvm#migrating-global-packages-while-installing
[tsc-multi]: https://github.com/tommy351/tsc-multi
[patching-gotchas]:
  https://charles-stover.medium.com/patching-packages-in-yarn-berry-72e4ded29a56
