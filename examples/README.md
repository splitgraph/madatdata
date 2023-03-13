# Running Examples

If you just want to try an example, simply install the `examples` worktree and
then run that example, e.g. for `react-nextjs-basic-hooks`:

```
cd examples
yarn install
cd react-nextjs-basic-hooks
yarn dev
```

Note: at the moment, the examples themselves are sparsely documented. The rest
of this guide is for developers who want to manage the examples, and optionally
develop them alongside changes to madatdata itself.

<details>
<summary><em>(todo: install `workspace-tools` plugin)</em></summary>
(todo: Install `workspace-tools` plugin in `examples` worktree, so that trying
an example only required `yarn workspaces focus` instead of installing all of
them)
</details>

# Developing Examples

This is a separate Yarn worktree which is _not_ connected to the root worktree.
It has its own `yarn.lock`, `.yarn`, and `.yarnrc.yml`. This is somewhat unusual
behavior, but we want to keep the `examples` directory isolated from the rest of
the project, while also keeping each `examples/*` package individually
installable, so we can later automate deployment of examples to various code
hosting platforms.

## Verdaccio: End to end test cycle for developing madatdata and examples

Scenario: You're developing on Madatdata and want to fix an issue in a specific
build of a specific package from npm. Here's the easiest way to do that.

Try to copy paste this "one liner" :) If it fails, run `pkill -f verdaccio` to
cleanup (keeping in mind it will kill any process on machine matching
`verdaccio` in its command line args).

```bash
# This example is for examples/react-nextjs-basic-hooks
# Modify the snippet accordingly depending on which example you're focused on

echo "Start in root of repository" \
  && { ( yarn node $(yarn bin verdaccio) --config ./verdaccio.yaml > verdaccio.log & export VERDACCIO_PID=$! ) ; } \
  && { echo "VERDACCIO_PID: $VERDACCIO_PID" ; } \
  && { yarn build && yarn verdaccio.reset ; } \
  && { yarn with-verdaccio publish-all ; } \
  && { cd examples ; yarn md.clear ; echo "Ignore above errors" ; VERDACCIO=http://localhost:4873 yarn install ; cd .. ; } \
  && { cd examples/react-nextjs-basic-hooks && rm -rf .next ; VERDACCIO=http://localhost:4873 yarn install ; cd ../.. ; } \
  ; { echo "Kill $VERDACCIO_PID" ; kill "$VERDACCIO_PID" ; ps aux | grep verdaccio ; } \
  ; { echo "Waiting" ; wait $(jobs -p) ; } \
  ; { echo "Verdaccio log: -----" ; cat verdaccio.log ; } \
  ; { echo ps aux | grep verdaccio ; } \
  ; { cd examples/react-nextjs-basic-hooks ; }
```

Note: this specific example also removes the `.next` directory in
`examples/react-nextjs-basic-hooks`. Other examples might have similar
directories that need to be deleted - by the nature of having realistic
examples, it can vary wildly and depends on the software being used.

Note: Each test cycle will change `yarn.lock` (which is why we do `yarn install`
and not `yarn install --immutable` here), as the hash of each local package
changes. It's best practice not to commit these changes into the repository, and
leave `yarn.lock` referencing hashes of public versions of our packages. This
way, the next developer starts from a known working state.

## Verdaccio: Delete everything (not just our packages) in `./examples`

_(Note: not very stable, and copy/pasted from some older documentation)_

```bash
cd examples
find ~/.yarn/berry/cache/ -type f -name '@madatdata*' -delete \
  ; rm -rf .yarn/install-state.gz node_modules react-nextjs-basic-hooks/node_modules \
    react-nextjs-ssr-hooks/node_modules .yarn/cache yarn.lock \
    react-nextjs-basic-hooks/.next \
  ; touch yarn.lock \
  && YARN_RC_FILENAME=.yarnrc.yml VERDACCIO=http://localhost:4873 yarn install
```

## Terminology

This document will refer to the "main" worktree, and the "examples" worktree, to
disambiguate the two Yarn worktrees without using words like "root" to
inaccurately describe them. They are distinct from each other. Each has its own
lockfile (`yarn.lock`), install state (`node_modules`), and configuration files
(`.yarn/`).

The "main" worktree is the worktree at the root of the repository, with a
package name of `@madatdata/root`.

The "examples" worktree is the worktree at the `examples` subdirectory of the
repository, with no package name assigned to it. Each subdirectory `examples/*`
is its own workspace, and the `hoistingLimits` rule in `examples/package.json`
ensures each example workspace installs its dependencies in complete isolation.

## Add a new example

If you just want to add an example (i.e. you don't also want to change the
`@madatdata` code itself), then you just need to run `yarn install` in the
examples worktree, which will install all packages as normal, including the
public version of each `@madatdata/*` package.

Then you just need to create a new example by copying an existing one.

If you do not need to modify any madatdata code, and your example works with the
published packages, then you can install the dependencies from the internet -
there is nothing more to do.

If you _do_ want to edit the madatdata source code, while also changing some
example code, then you can install the dependencies from a localhost Verdaccio
server, where you can publish builds from the main worktree. (Note that in all
cases you still need to _start_ by installing dependencies from the internet,
but you can then override only the `@madatdata/*` dependencies with those from
Verdaccio).

# Developing Examples (with local `@madatdata/*`)

The rest of this guide documents the workflow for developing examples, while
simultaneously developing `@madatdata` itself. Basically, it describes the
workflow for pushing local builds from the main worktree to Verdaccio, and then
installing them from Verdaccio into the examples worktree.

## Install dependencies from internet

To install all the dependencies for all of the examples, simply run
`yarn install` which will behave like a default Yarn project.

```
# in the examples worktree
yarn install
```

Note: Even in local development, always start by installing dependencies from
the internet, since the Verdaccio workflow only overwrites `@madatdata/*`
packages and leaves the rest untouched.

## Install `@madatdata/*` dependencies from local Verdaccio

To start Verdaccio, from main worktree (repository root), run:

```
# from the main worktree (repository root)
yarn verdaccio.start
```

### Push packages to Verdaccio (from the main worktree)

Once you've started Verdaccio, you probably want to publish a package to it. If
you're using Verdaccio in development, you probably don't want to bother
changing the version of each package every debug cycle.

To build and publish a package from the main worktree (repo root), the basic
workflow is to build the package, reset Verdaccio storage, and then publish it:

```bash
# In the main worktree, build the packages for publishing
yarn build

# Reset Verdaccio storage (Verdaccio doesn't need to be running, but okay if it is)
yarn verdaccio.reset

# In a separate terminal/process, make sure you've started Verdaccio (see above):
# yarn verdaccio.start

# Push newly built packages to Verdaccio using normal workflow and `with-verdaccio`
yarn with-verdaccio publish-all

# If you did not run `yarn verdaccio.reset, you might add --tolerate-republish:
yarn with-verdaccio publish-all --tolerate-republish
```

The local Verdaccio server configuration is to never proxy `@madatdata/`
packages, i.e. to only serve packages from local Verdaccio storage.
Conveniently, we can reset this storage by deleting its JSON files in
`.verdaccio/storage/*`.

This ensures that the latest package is in this `storage` of the Verdaccio
server. This way, any client installing from Verdaccio will get the latest
package (unless the client cache already contains an entry for that package
version, i.e. a package with the same version number but a different hash – a
likely scenario during local development, and also the reason for the workflow
of resetting before each new install).

You can verify the latest package is in the Verdaccio store by extracting its
contents from the `.tgz` file in `.verdaccio/storage/@madatdata/*/*-*.tgz`.

### Pull packages from Verdaccio (into the examples worktree)

Once you've pushed the latest packages to local Verdaccio, you can "pull" them
into the examples worktree. In practice, this means removing all references to
any `@madatdata` dependencies, including in the lockfile (`yarn.lock`), the
linker install state (`node_modules/.yarn-state.yml`), the cache (local and
global), and the dependencies themselves at `*/node_modules/@madatdata`.

To clear the `@madatdata/*` packages and then install them from Verdaccio:

```bash
# In the examples worktree (assumed already ran `yarn install` at least once)
yarn verdaccio.pull
```

The workflow for resetting this state of the `examples` worktree prunes its
dependencies _only_ of `@madatdata`, while leaving all other packages intact.
This way, it's quick to resync the `examples` worktree while only needing to
redownload the `@madatdata` dependencies (instead of e.g. nuking the entire
`node_modules/.yarn-state.yml`, which would invalidate the entire worktree and
require re-installing and linking every dependency).

The `verdaccio.pull` command calls this cleanup command before install, but you
can also call it directly with `yarn md.clear` ("madatdata clear").

### In general: Wrap Yarn commands with `yarn with-verdaccio`

In general, "using Verdaccio" means setting an environment variable `VERDACCIO`
for the Yarn configs to interpolate as the localhost address for registry
configuration, with a default fallback to `https://registry.yarnpkg.com` (the
Yarn proxy to the public npm registry).

e.g., a command of `yarn with-verdaccio install` would run `yarn install` with
environment variable `VERDACCIO` set to its localhost address. The command will
fail if the local Verdaccio server is not running.

### Keep in mind: Verdaccio packages end up in the cache too

Keep in mind: if you've been iterating locally with Verdaccio using a version
that conflicts with a public version (which is the recommended workflow), then
the next time you do a normal `yarn install` (without Verdaccio), it might try
to install the local packages, which have the same version as the remote and are
located in the local cache. Or, depending on local state (if the lockfile has
the checksum from the test version), `yarn install` might refuse the checksum of
the real package.

To avoid this, consider calling `yarn md.clear` after a localhost development
session where you installed unpublished versions of `@madatata/*` packages from
Verdaccio into the examples worktree.
