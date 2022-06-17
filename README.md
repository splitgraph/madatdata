## What is Madatdata?

Madatdata ("mad at data") is a framework for working with data [in anger][in-anger].
Specifically, it's a toolkit for building data-driven Web apps, shipping
them to production, and keeping them running and up-to-date.

It aims to provide a pluggable core API for solving common problems with
data-driven Web apps, such as querying, authentication, data management,
server-side rendering, client-side caching and hydration. It works best with
Splitgraph, but is not exclusive to it. The main constant is SQL, and the API
is designed with generic data providers in mind. It's developed for the
truly modern Web, with strategies for deploying to targets like Vercel, Fly.io,
Cloudflare Workers, and Deno Deploy.
## What is Splitgraph?

[Splitgraph][splitgraph] is a serverless data platform where you can query,
upload, connect and share tables of data. It's an opinionted implementation of
the modern data stack, interoperable with much of the SQL ecosystem. It's built
around Postgres — you can literally connect to it at `data.splitgraph.com:5432` —
and it's optimized for analytical queries over external data tables.

## What can I do with it?

Madatdata is an alpha stage project built on top of Splitgraph, which is a
production-ready platform backed by multiple years of development.

This monorepo contains a growing collection of tools for working with Splitgraph
from the Web. Currently, that includes packages that facilitate sending queries
to Splitgraph from the browser over HTTP with `fetch`, and from the server over
the Postgres protocol with `postgres`. Namely, these packages are `@madatdata/client-http`
and `@madatdata/client-postgres`. They both implement the `Client` interface and
abstract base class provided by `@madatdata/client-base`, in a pattern
representative of how the rest of this repository will develop.

### Query Splitgraph with SQL in modern client side apps

All data on Splitgraph is available through not only a Postgres interface, but
also an HTTP "web bridge" that wraps SQL queries from the body of the request,
sends them to the database, and sends back a JSON response.

This means you can query Splitgraph wherever you have `fetch`. Easily integrate
with common frameworks like Next.js:


```ts
import "cross-fetch/polyfill";
import { makeClient } from "@madatdata/client-http";

// Anonymous queries are supported for public data by default
const client = makeClient({ credential: null });

client
  .execute<{ foo: number; bar: number }>("SELECT 1 as foo, 2 as bar;")
  .then(({ response, error }) => {
    if (response) {
      for (let row of response.rows) {
        // row.foo and row.bar will be available in TypeScript autocompletion
        console.log(`foo = ${row.foo}, bar = ${row.bar}`);
      }
    } else if (error) {
      console.error("Error!");
      console.error(JSON.stringify(error, null, 2));
    }
  })
  .catch(console.trace);
```

### Query Splitgraph with SQL from Observable notebooks

Import the client from any CDN like Skypack into a Observable notebook
([see an example](https://observablehq.com/@milesrichardson/madatdata-client-testing)):

```js
import("https://cdn.skypack.dev/@madatdata/client-http@latest");
client = splitgraph.makeClient({ credential: null })
result = await client.execute(`
  select
    to_date(date, 'MM/DD/YYYY') as raw_date,
    date_part('year', to_date(date, 'MM/DD/YYYY')) || '-' ||
    date_part('week', to_date(date, 'MM/DD/YYYY')) as year_week,
    date,
    count(state_tribe_territory)
  from "cdc-gov/us-state-and-territorial-public-mask-mandates-from-tzyy-aayg:latest"."us_state_and_territorial_public_mask_mandates_from"
  where face_masks_required_in_public = 'Yes'
  group by date
  order by raw_date asc;
`)

states_with_mask_mandates = result.response.rows.map(
  row => ({
    ...row,
    raw_date: new Date(row.raw_date),
  })
)

Plot.plot({
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(states_with_mask_mandates, {x: "raw_date", y: "count"})
  ]
})
```

### Query Splitgraph with Postgres on the server

All data on Splitgraph is available through a unified Postgres interface which
is queryable from most existing Postgres clients.

The interface is exactly the same for querying data over Postgres as it is for
querying data over HTTP:

```ts
import "cross-fetch/polyfill";
import { makeClient } from "@madatdata/client-postgres";

const client = makeClient({
  credential: {
    apiKey: "Get yours at https://www.splitgraph.com/connect/query",
    apiSecret: "Get yours at https://www.splitgraph.com/connect/query",
  },
});

client
  .execute<{ foo: number; bar: number }>("SELECT 1 as foo, 2 as bar;")
  .then(({ response, error }) => {
    if (response) {
      console.log(JSON.stringify(response, null, 2));

      for (let row of response.rows) {
        console.log(`foo = ${row.foo}, bar = ${row.bar}`);
      }
    } else if (error) {
      console.error("Error!");
      console.error(JSON.stringify(error, null, 2));
    }
  })
  .catch(console.trace);
```
## What _will_ I be able to do with it? (under development)


## How do I use it?

### Packaging and Installation




### Usage and API

...

## Background

### How do data producers use Splitgraph?

Splitgraph makes data integration easy. "Import Plugins" are available for
importing from hundreds of data sources, including full support for the Airbyte
standard. "Mount Plugins" are available for routing queries directly to many
common data sources.

Data producers can work with Splitgraph at a low level, using the `sgr` command
line client to build data images and execute Splitgraph API operations. Similarly
to Docker and docker-compose, `sgr` also provides a declarative `splitgraph.yml`
syntax for managing data sources and orchestrating ingestion pipelines. Much of
Splitgraph is built on `sgr` – in fact, Splitgraph.com is an `sgr` "peer" – but
you don't need to understand it at a low level to benefit from Splitgraph.

### How should data consumers use Madatdata?

In the Splitgraph ecosystem, if sgr is the tool for producing data, then madatdata
is the tool for consuming it. Together, they blur the lines between data producer
and data consumer.

Madatdata is complementary, but not exclusive, to Splitgraph.

For data consumers, the primary value of Splitgraph comes from its unified
Postgres endpoint at `data.splitgraph.com`, which is no different than any other
Postgres frontend, apart from all the magic that happens on the backend.

### Is Madatdata only useful with Splitgraph?

While the most immediate benefits of Madatdata depend on its integration with
Splitgraph, any implementation-specific behavior is isolated inside a plugin
package. Madatdata is not designed to be exclusive to Splitgraph, and the core
API should in theory be usable with any data source. As such, we welcome plugins
that implement or extend the API for other data sources or providers.


# Packaging and Installation

....


--------------
# Development

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

## Run (test)

This repo is designed for test-driven development. As such, to run all tests in
watch mode, simply run:

```
yarn test
```

## Typecheck

We use `tsc` for typechecking, with the default solution file `tsconfig.json`
which emits only declaration files into `dist`. This should be sufficient for
editor integration and command line typechecking:

```
yarn typecheck
```

## Build

We use `tsc-multi` to build packages for multiple targets, from the root solution
file of `tsconfig.build.json`, with build destination of `packages/*/build/{target}/*`.

```
yarn build
```



###


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

[splitgraph]: https://www.splitgraph.com
[in-anger]: https://english.stackexchange.com/questions/30939/is-used-in-anger-a-britishism-for-something
