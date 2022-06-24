# 😡 📈 Madatdata

- [😡 📈 Madatdata](#--madatdata)
  - [Why are you mad at the data?](#why-are-you-mad-at-the-data)
  - [What is Madatdata?](#what-is-madatdata)
  - [What is Splitgraph?](#what-is-splitgraph)
  - [What can I do with it?](#what-can-i-do-with-it)
    - [Query Splitgraph with SQL from the browser with modern frameworks](#query-splitgraph-with-sql-from-the-browser-with-modern-frameworks)
    - [Query Splitgraph with SQL from Observable notebooks](#query-splitgraph-with-sql-from-observable-notebooks)
    - [Query Splitgraph with SQL from Postgres on the server](#query-splitgraph-with-sql-from-postgres-on-the-server)
- [Background](#background)
  - [How do data producers use Splitgraph?](#how-do-data-producers-use-splitgraph)
  - [How should data consumers use Madatdata?](#how-should-data-consumers-use-madatdata)
  - [Is Madatdata only useful with Splitgraph?](#is-madatdata-only-useful-with-splitgraph)
- [How do I use it?](#how-do-i-use-it)
  - [Packages available on `npm`](#packages-available-on-npm)
  - [Installation](#installation)
    - [In browser with Skypack](#in-browser-with-skypack)
    - [In Node, Postgres client only](#in-node-postgres-client-only)
    - [In Node and/or browser, HTTP client](#in-node-andor-browser-http-client)
    - [In Node, both Postgres and HTTP client](#in-node-both-postgres-and-http-client)
    - [In Deno (todo)](#in-deno-todo)
- [What's next?](#whats-next)
  - [Repo layout](#repo-layout)
  - [Improvements coming soon](#improvements-coming-soon)
  - [Packages coming soon](#packages-coming-soon)
    - [Soon: `@madatdata/base-db`and `@madatdata/db-splitgraph`](#soon-madatdatabase-dband-madatdatadb-splitgraph)
    - [Soon: `@madatdata/sql-components`](#soon-madatdatasql-components)
    - [Soon: `@madatdata/base-cache`, `@madatdata/base-worker-cache`, and `@madatdata/cache-duckdb`](#soon-madatdatabase-cache-madatdatabase-worker-cache-and-madatdatacache-duckdb)
    - [Soon: `@madatdata/base-web-bridge` and `@madatdata/web-bridge-fastify`](#soon-madatdatabase-web-bridge-and-madatdataweb-bridge-fastify)
- [Contributing](#contributing)
  - [Development workflow](#development-workflow)
    - [Install](#install)
    - [Run (test)](#run-test)
    - [Typecheck](#typecheck)
    - [Build](#build)
    - [Clean](#clean)
    - [Final check before commit](#final-check-before-commit)
  - [Upgrade everything at once, interactively](#upgrade-everything-at-once-interactively)
- [Appendix](#appendix)
  - [Alternative Names](#alternative-names)

## Why are you mad at the data?

Madatdata ("mad at data") is a framework for working with data [in
anger][in-anger].

## What is Madatdata?

It's a toolchain for building data-driven Web apps, shipping them to production,
and keeping them running and up-to-date.

It aims to provide a pluggable core API for solving common problems with
data-driven Web apps, such as querying, authentication, data management,
server-side rendering, client-side caching and hydration. It works best with
[Splitgraph][splitgraph], but is not exclusive to it. The main constant is SQL,
and the API is designed with generic data providers in mind. It's developed for
the truly modern Web, with strategies for deploying to targets like Vercel,
Fly.io, Cloudflare Workers, and Deno Deploy.

## What is Splitgraph?

[Splitgraph][splitgraph] is a serverless data platform where you can query,
upload, connect and share tables of data. It's an opinionted implementation of
the modern data stack, interoperable with much of the SQL ecosystem. It's built
around Postgres — you can literally connect to it at
[`data.splitgraph.com:5432`][splitgraph-connect-query] — and it's optimized for
analytical queries over external data tables.

## What can I do with it?

Madatdata is an alpha stage project built on top of Splitgraph, which is a
production-ready platform backed by multiple years of development.

This monorepo contains a growing collection of tools for working with Splitgraph
from the Web. Currently, that includes packages that facilitate sending queries
to Splitgraph from the browser over HTTP with `fetch`, and from the server over
the Postgres protocol with [`postgres`][github-porsager-postgres]. Namely, these
packages are `@madatdata/client-http` and `@madatdata/client-postgres`. They
both implement the `Client` interface and abstract base class provided by
[`@madatdata/base-client`][src-base-client], in a pattern representative of how
the rest of this repository will develop.

### Query Splitgraph with SQL from the browser with modern frameworks

All data on Splitgraph is available through not only a Postgres interface, but
also an HTTP ["web bridge"][docs-web-bridge-api] that wraps SQL queries from the
body of the request, sends them to the database, and sends back a JSON response.

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

Import the client from any CDN like Skypack into a Observable notebook ([see an
example][observable-madatdata-testing]):

```js
import("https://cdn.skypack.dev/@madatdata/client-http@latest");
client = splitgraph.makeClient({ credential: null });
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
`);

states_with_mask_mandates = result.response.rows.map((row) => ({
  ...row,
  raw_date: new Date(row.raw_date),
}));

Plot.plot({
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(states_with_mask_mandates, { x: "raw_date", y: "count" }),
  ],
});
```

### Query Splitgraph with SQL from Postgres on the server

All data on Splitgraph is available through a unified Postgres interface which
is [queryable from most existing Postgres clients][splitgraph-connect-query].

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

# Background

## How do data producers use Splitgraph?

Splitgraph makes data integration easy. "Import Plugins" are available for
importing from [hundreds of data sources][splitgraph-connect-data], including
full support for the Airbyte standard. "Mount Plugins" are available for routing
queries directly to many common data sources.

Data producers can work with Splitgraph at a low level, using the [`sgr` command
line client][docs-sgr-cli] to build data images and execute Splitgraph API
operations. Similarly to Docker and docker-compose, `sgr` also provides a
declarative [`splitgraph.yml`][docs-splitgraph-yml] syntax for managing data
sources and orchestrating ingestion pipelines. Much of Splitgraph is built on
`sgr` - in fact, Splitgraph.com is an `sgr` "peer" - but you don't need to
understand it at a low level to benefit from Splitgraph.

## How should data consumers use Madatdata?

In the Splitgraph ecosystem, if sgr is the tool for producing data, then
madatdata is the tool for consuming it. Together, they blur the lines between
data producer and data consumer.

Madatdata is complementary, but not exclusive, to Splitgraph.

For data consumers, the primary value of Splitgraph comes from its unified
Postgres endpoint at `data.splitgraph.com`, which is no different than any other
Postgres frontend, apart from all the magic that happens on the backend.

## Is Madatdata only useful with Splitgraph?

While the most immediate benefits of Madatdata depend on its integration with
Splitgraph, any implementation-specific behavior is isolated inside a plugin
package. Madatdata is not designed to be exclusive to Splitgraph, and the core
API should in theory be usable with any data source. As such, we welcome plugins
that implement or extend the API for other data sources or providers.

# How do I use it?

## Packages available on `npm`

🔜 = intend to support, but untested

| Package                                             | Browser | Node | Deno |     |
| --------------------------------------------------- | ------- | ---- | ---- | --- |
| [`@madatdata/base-client`][npm-base-client]         | ✅      | ✅   | 🔜   |     |
| [`@madatdata/client-http`][npm-client-http]         | ✅      | ✅   | 🔜   |     |
| [`@madatdata/client-postgres`][npm-client-postgres] | 🚫      | ✅   | 🔜   |     |

Currently, there is no browser bundle, but browsers supporting `esm` can use
Skypack to load the modules as expected, with a default target of `ES2020`.

The mission of this monorepo is to consolidate the fragmented complexity of many
different SQL tools into a manageable interface.

## Installation

### In browser with Skypack

This would probably work in Deno too. We'd like it to, we just haven't tested it
or productionized the cross-compiling toolchain for it yet.

```js
import("https://cdn.skypack.dev/@madatdata/client-http@latest");
```

### In Node, Postgres client only

```bash
yarn add postgres @madatdata/client-postgres
```

### In Node and/or browser, HTTP client

for testing in Node and/or building for the client (need `cross-fetch` polyfill)

```bash
yarn add cross-fetch @madatdata/client-postgres
```

(note: Currently custom `fetch` not supported, but coming soon)

### In Node, both Postgres and HTTP client

This is likely what you want if you're doing SSR or any sort of isomorphic app.

```
yarn add postgres @madatdata/client-postgres cross-fetch @madatdata/client-http
```

### In Deno (todo)

Support is intended and coming soon. It will probably work already if you use
skypack in the same way as Observable.

# What's next?

## Repo layout

The current goal is to develop a `@madatdata/core` API which is effectively a
metapackage implementing the [strategy pattern][strategy-pattern], wherein the
core API executes a specific set of "algorithms" according to a mapping of
algorithm to "strategy" injected at runtime.

At the moment, there is basically one "algorithm," which is `execute`, i.e. send
a query to Splitgraph and return the result as JSON. Its strategy is described
by the interface and abstract `BaseClient` class in
[`@madatdata/base-client`][src-base-client]. There are currently two
implementations of `BaseClient` strategy for the `execute` algorithm. For HTTP
clients, [`@madatdata/client-http`][src-client-http] implements it using `fetch`
to query the "web bridge" at Splitgraph. For Postgres clients,
[`@madatdata/client-postgres`][src-client-postgres] implements it using
`postgres` to query the "Data Delivery Network" at
[`data.splitgraph.com:5432`][splitgraph-connect-query].

In general, the strategies are named after the library they're effectively
wrapping, so there might be a future `@madatdata/client-pg` or
`@madatdata/client-duckdb`. Those libraries, or polyfills, are marked as peer
dependencies to avoid version lock. Keep in mind this means you will need to
install that dependency (e.g. [`postgres`][github-porsager-postgres] or
[`cross-fetch`][github-cross-fetch]) for any `@madatdata` package to be able to
use it.

## Improvements coming soon

- `@madatdata/core` API for single package installation and application context
  encapsulation
- Examples and reference implementations for common patterns
- `@madatdata/base-db` and `@madatdata/db-splitgraph` for managing Splitgraph
  databases and connections
- Streaming support for `execute` via async iterators, with WHATWG support where
  possible
- More wrappers around libraries e.g. [`pg`][github-node-pg] which uses native
  `libpq` bindings unlike [`postgres`][github-porsager-postgres]

## Packages coming soon

| Package                         | Browser | Node     | Deno     |     |
| ------------------------------- | ------- | -------- | -------- | --- |
| `@madatdata/base-cache`         | 🔜      | 🔜       | 🔜       |     |
| `@madatdata/base-worker-cache`  | 🔜      | 🔜       | 🔜       |     |
| `@madatdata/base-client`        | ✅      | ✅       | 🔜       |     |
| `@madatdata/base-db`            | 🔜      | 🔜       | 🔜       |     |
| `@madatdata/base-web-bridge`    | 🔜      | 🔜       | 🔜       |     |
| `@madatdata/cache-duckdb`       | 🔜      | 🔜       | 🔜       |     |
| `@madatdata/client-http`        | ✅      | ✅       | 🔜       |     |
| `@madatdata/client-postgres`    | 🚫      | ✅       | 🔜       |     |
| `@madatdata/db-splitgraph`      | 🔜      | 🔜       | 🔜       |     |
| `@madatdata/sql-components`     | 🔜      | 🔜 (SSR) | 🔜 (SSR) |     |
| `@madatdata/web-bridge-fastify` | 🔜      | 🔜       | 🔜       |     |

### Soon: `@madatdata/base-db`and `@madatdata/db-splitgraph`

The `db` algorithm will be implemented by strategies extending the base
implementation in `@madatdata/base-db`, starting with the
`@madatdata/db-splitgraph` strategy. This will include functionality for
managing the database, which is mostly opaque to the rest of the API, aside from
the tables that end up queryable inside of it. For `@madatdata/db-splitgraph`,
the main functionality will be around managing data sources.

This is something you can already do with `sgr`, and even declaratively with
`splitgraph.yml`. But adding it to the `madatdata` toolchain unlocks use cases
like building databases per branch - or even per page! - in CI, exporting each
to a duckdb cache, and loading it at runtime in the serverless application
layer.

Example, for the imagination:

```ts
const mount = await db.mount("miles/scraper-data:live", {
  connstr: "postgresql://localhost:5432",
  tunnel: true,
});
await db.execute(
  `CREATE table "miles/scraper-data:stable".widgets AS SELECT * FROM "miles/scraper-data:live".widgets`
);
await mount.disconnect();
const { response, error } = await db.execute(
  `SELECT * FROM "miles/scraper-data:stable".widgets`
);
```

This will be querying the public Splitgraph GraphQL API, which is currently
undocumented and unsupported. But as part of this project, we will be
productionizing a public version of that API, and this repository will
eventually consume that.

### Soon: `@madatdata/sql-components`

The basic premise is `styled` components, but with a SQL query attached instead
of a CSSProperties object. The current idea is perhaps most similar to the
`relay` compiler. Not too much thought has been put into this yet.

### Soon: `@madatdata/base-cache`, `@madatdata/base-worker-cache`, and `@madatdata/cache-duckdb`

The `cache` algorithm will be implemented by some implementations extending
`@madatdata/base-cache`, or its variant `@madatdata/base-worker-cache`. To
start, `@madatdata/cache-duckdb` will implement a strategy for the
`@madatdata/base-worker-cache` algorithm variant.

The basic idea is that we can export arbitrary queries from Splitgraph, and then
we can do a bunch of crazy stuff with that. For example, during build time, we
could build a duckdb "cache" for each page, which contains all the data
necessary to resolve the queries on that page (or group of related pages). Or,
for server-rendered pages, the cache could be used for fast lookups, using an
in-memory database which is occasionally hydrated with the latest updates from
the origin database, to store metadata that blocks the request path, like
session identifiers or geolocation mappings.

The `@madatdata/base-worker-cache` will define RPC interfaces for a messaging
protocol between web workers (intended to be compatible with browsers, Deno
Deploy, Cloudflare Workers, and similar), so that the client can `execute` a
query by first checking the cache in a worker, and then sending it to the origin
only for a cache miss (which might never happen if we build the database for the
page ahead of time).

### Soon: `@madatdata/base-web-bridge` and `@madatdata/web-bridge-fastify`

Currently, the Splitgraph [web bridge][docs-web-bridge-api] is running on our
own infrastructure, separately from this repository. However, it makes sense to
create a new version of it which is part of this repository, so that it can
share types and implementation details with the other packages here.
Effectively, in theory, the bridge for transforming HTTP to SQL should simply
depend on `@madatdata/client-http` and `@madatdata/client-postgres`.

This `@madatdata/base-web-bridge` will be written as a simple module that parses
the query from the request, according to the shape of the request type defined
here, and sends it to the database using the `@madatdata/db` API.

There will be a shim adapter for each web server, starting with
`@madatdata/web-bridge-fastify`, which is a small wrapper around
`@madatdata/base-web-bridge` to ensure its compatibility with Fastify.

---

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

[src-base-client]: ./packages/base-client/index.ts
[src-client-http]: ./packages/client-http/client-http.ts
[src-client-postgres]: ./packages/client-postgres/client-postgres.ts
[npm-base-client]: https://www.npmjs.com/package/@madatdata/base-client
[npm-client-http]: https://www.npmjs.com/package/@madatdata/client-http
[npm-client-postgres]: https://www.npmjs.com/package/@madatdata/client-postgres
[splitgraph]: https://www.splitgraph.com
[splitgraph-connect-data]: https://www.splitgraph.com/connect/data
[splitgraph-connect-query]: https://www.splitgraph.com/connect/query
[docs-sgr-cli]: https://www.splitgraph.com/docs/sgr-cli/introduction
[docs-web-bridge-api]: https://www.splitgraph.com/docs/query/ddn-http
[docs-splitgraph-yml]:
  https://www.splitgraph.com/docs/splitgraph.yml/introduction
[strategy-pattern]: https://refactoring.guru/design-patterns/strategy
[github-porsager-postgres]: https://github.com/porsager/postgres
[github-cross-fetch]: https://github.com/lquixada/cross-fetch
[github-node-pg]: https://github.com/brianc/node-postgres
[github-nvm-migrate-global-packages]:
  https://github.com/nvm-sh/nvm#migrating-global-packages-while-installing
[observable-madatdata-testing]:
  https://observablehq.com/@milesrichardson/madatdata-client-testing
[tsc-multi]: https://github.com/tommy351/tsc-multi
[in-anger]:
  https://english.stackexchange.com/questions/30939/is-used-in-anger-a-britishism-for-something

# Appendix

## Alternative Names

- Madatdata
- DSX
- DDX
