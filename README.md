# 😠📈 Madatdata

Madatdata ("mad at data") is a framework for working with data [in
anger][in-anger]. Specifically, it's a TypeScript toolkit for building
data-driven Web apps with SQL. Its main use cases include _managing_ databases
(exporting and importing data) and querying them directly with SQL.

It works best with [Splitgraph][splitgraph] and [Seafowl][seafowl], but is not
exclusive to either of them. It aims to provide a pluggable core API for solving
common problems with data-driven Web apps, such as querying, authentication,
data management, server-side rendering, client-side caching and hydration.

The main constant is SQL, and the API is designed with generic data providers in
mind, so it should be easy to add bindings for other databases, like generic
Postgres or SQLite or DuckDB. It's developed for the truly modern Web, with the
goal of making it simple to deploy data-driven web apps to targets like Vercel,
Fly.io, Cloudflare Workers, and Deno Deploy.

## What are Splitgraph and Seafowl?

[Splitgraph][splitgraph] is a serverless data platform where you can query,
upload, connect and share tables of data. It's an opinionted implementation of
the modern data stack, interoperable with much of the SQL ecosystem. It's built
around Postgres — you can literally connect to it at
[`data.splitgraph.com:5432`][splitgraph-connect-query] — and it's optimized for
analytical queries over external data tables.

[Seafowl][seafowl] is an open source analytical database optimized for running
cache-friendly queries "at the edge." It's written in Rust and uses Datafusion
as a SQL query engine, with a storage layer based on the Delta Lake protocol
implemented with delta-rs.

Splitgraph and Seafowl work great together. One common workflow is to treat
Splitgraph as a data lake, and export production datasets to Seafowl for
querying from Web apps. You can export this from the Splitgraph web interface,
or from a GraphQL API call, or using Madatdata itself.

## What can I do with it?

Madatdata is an alpha stage project, but it works well for basic use cases with
both Splitgraph (which is a production-ready platform backed by multiple years
of development), and Seafowl (which is a more recent, but production-ready
project that incorporates many lessons learned building Splitgraph).

Currently, Madatdata enables the following workflows for Splitgraph and Seafowl:

**Splitgraph**

- Query Data on the [Splitgraph DDN][splitgraph-ddn]
  - from the browser over HTTP with `fetch` (or with React hooks like `useSql`)
  - from the server over the Postgres protocol with
    [`postgres`][github-porsager-postgres]
- Manage your Splitgraph database via plugins that hit the [Splitgraph GraphQL
  API][splitgraph-graphql-api]
  - Import (ingest) data from 100+ sources, including most Airbyte adapters and
    some Singer taps
  - Export data to CSV or Parquet (which can then be imported to Seafowl, see
    below)

**Seafowl**

- Query Data in a Seafowl Database, like one [deployed to Fly.io][seafowl-flyio]
  - from the browser over HTTP with `fetch` (or with React hooks like `useSql`)
- Manage your Seafowl database via plugins
  - Import (ingest) data from a remote URL, like a
    [Parquet file exported from Splitgraph](./packages/core/splitgraph-seafowl-sync.test.ts)

## Basic Usage and Examples

See the [examples directory](./examples) for deployable examples using common
web frameworks and bundlers, including **Next.js** and **Vite**.

### Query Splitgraph with SQL from the browser with modern frameworks

All data on Splitgraph is available through not only a Postgres interface, but
also an HTTP ["web bridge"][docs-web-bridge-api] that wraps SQL queries from the
body of the request, sends them to the database, and sends back a JSON response.

This means you can query Splitgraph wherever you have `fetch`. Easily integrate
with common frameworks like Next.js:

```ts
import "cross-fetch/polyfill";
import { makeSplitgraphHTTPContext } from "@madatdata/client-http";

// Anonymous queries are supported for public data by default
const { client } = makeSplitgraphHTTPContext({ credential: null });

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

### Query Splitgraph with SQL from Observable notebooks, browsers or Deno using ESM Modules

You can import the Madatdata client via a bundling CDN like [esm.sh]esm-sh,
which should work in any environment where ES modules are supported, including
browsers and Deno.

(Note: For Observable, you might be more interested in using Seafowl with the
native [Seafowl Observable client][seafowl-observable-client], like in this
[example notebook][seafowl-native-observable-demo].)

For example, this is the [code for an observable notebook to query data with
madatdata][observable-esm-example] and plot it:

```js
madatdata = import("https://esm.sh/@madatdata/core@latest");
client = madatdata.makeSplitgraphHTTPContext({ credential: null }).client;
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

Currently, the Postgres client is only implemented for Splitgraph, and so
(misleadingly) the generic `client-postgres` is sufficient to query it (as
opposed to HTTP, which requires `makeHTTPContext`):

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

### Import data into Splitgraph with plugins

See
[example code in `db-splitgraph.test.ts`](./packages/db-splitgraph/db-splitgraph.test.ts)
(ctrl+f for `importData`)

### Export data from Splitgraph to CSV and Parquet files

See
[example code in `db-splitgraph.test.ts`](./packages/db-splitgraph/db-splitgraph.test.ts)
(ctrl+f for `exportData`)

### Import data into Seafowl

See
[example code in `db-seafowl.test.ts`](packages/db-seafowl/db-seafowl.test.ts)
(ctrl+f for `importData`)

For an example of exporting data from Splitgraph, and then importing it into
Seafowl, see
[example code in `splitgraph-seafowl-sync.test.ts`](packages/core/splitgraph-seafowl-sync.test.ts)

## Installation

### Common Use Cases

If you already have a bundler in place, you probably just want to install
`@madatdata/core`, which will include all packages, but tree shaking should take
care of eliminating code that you don't use:

```
yarn install @madatdata/core
```

If you are writing a React application, you probably want to install
`@madatdata/react`, which also re-exports `@madatdata/core` (but you can install
both explicitly if you prefer):

```
yarn install @madatdata/react
```

Currently, there is no browser bundle, but browsers supporting `esm` _should_ be
able to use Skypack to load the modules as expected, with a default target of
`ES2020`, however this is currently broken due to the `crypto` module not being
exported.

In theory, you should be able to install this with Deno, but we have not
explicitly tested it yet. Please try it if you have the chance, and open an
issue or PR with any problems you find.

## Package Layout and Interface

The mission of this monorepo is to consolidate the fragmented complexity of many
different SQL tools into a manageable interface. The basic idea is to divide
functionality into abstract base interfaces, and implementations of those
interfaces for different data providers and transports.

### Core Packages

The "core" packages are probably what you want to install, depending on your
bundler setup.

| Package                         | Purpose                                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@madatdata/core`][npm-core]   | Wrapper around other packages, with functions for instantiating "data contexts" which include `client` and `db` objects, e.g. `makeSplitgraphHTTPContext`. |
| [`@madatdata/react`][npm-react] | React hooks for querying different databases, and also re-exports `@madatdata/core`                                                                        |

### Base Packages

The "base" packages define the abstract interface which is implemented in the
"implementation" packages (see below). Usually, you do not want to install these
directly, unless you're building your own implementation of one of them.

| Package                                     | Interface | Base Class   | Purpose                                                                                                                                                                                                                    |
| ------------------------------------------- | --------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@madatdata/base-client`][npm-base-client] | `Client`  | `BaseClient` | Defines how to execute queries against a given `Db`.                                                                                                                                                                       |
| [`@madatdata/base-db`][npm-base-db]         | `Db`      | `BaseDb`     | Defines a pluggable interface for querying and managing a database, currently consisting of methods `execute`, `importData`, and `exportData`, all of which can be implemented with plugins injected into the constructor. |

### Implementation Packages

**`Client` implementations**

These packages implement the `Client` interface and extend the
[`BaseClient` base class](./packages/base-client/index.ts).

| Package                                             | Purpose                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@madatdata/client-http`][npm-client-http]         | Execute queries via an HTTP interface with `fetch`, where the exact strategies and responses can be implemented by the corresponding `Db` implementation (e.g., `db-splitgraph` and `db-seafowl` define how to implement their own `client-http` strategies). |
| [`@madatdata/client-postgres`][npm-client-postgres] | Execute queries using the [`postgres` wire protocol][github-porsager-postgres]. Currently only implemented for `db-splitgraph`, but could be used by any `Db` implementation that is Postgres-compatible.                                                     |

**`Db` implementations**

These packages implement the `Db` interface and extend the
[`BaseDb` base class](packages/base-db/base-db.ts).

| Package                                         | Purpose                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@madatdata/db-splitgraph`][npm-db-splitgraph] | Implements the `Db` interface for the Splitgraph DDN, including anonymous and authenticated queries, and provides plugins for all 100+ data sources importable into Splitgraph. Compatible with both `client-http` and `client-postgres`.                                                                             |
| [`@madatdata/db-seafowl`][npm-db-seafowl]       | Implements the `Db` interface for Seafowl databases (deployed anywhere with a publicly reachable URL), and implements `importData` for any CSV or Parquet data source with a remote URL. Compatible with `client-http`, and uses the `crypto` module for fingerprinting queries according to Seafowl cache semantics. |

# What's next?

Below are some possible ideas of where we might take this.

### Mounting local databases

This is
[already possible via the `sgr` command line](https://www.splitgraph.com/docs/add-data/with-tunnel),
but can be nicely implemented in TypeScript too. But adding it to the
`madatdata` toolchain unlocks use cases like building databases per branch - or
even per page! - in CI, exporting each to a duckdb cache, and loading it at
runtime in the serverless application layer.

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

### `@madatdata/sql-components`

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

### `@madatdata/base-web-bridge` and `@madatdata/web-bridge-fastify`

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

# Contributing

For development workflows and information about contributing to this repository,
see [./CONTRIBUTING.md](./CONTRIBUTING.md)

---

[src-base-client]: ./packages/base-client/index.ts
[src-client-http]: ./packages/client-http/client-http.ts
[src-client-postgres]: ./packages/client-postgres/client-postgres.ts
[npm-base-client]: https://www.npmjs.com/package/@madatdata/base-client
[npm-base-db]: https://www.npmjs.com/package/@madatdata/base-db
[npm-client-http]: https://www.npmjs.com/package/@madatdata/client-http
[npm-client-postgres]: https://www.npmjs.com/package/@madatdata/client-postgres
[npm-core]: https://www.npmjs.com/package/@madatdata/core
[npm-db-seafowl]: https://www.npmjs.com/package/@madatdata/db-seafowl
[npm-db-splitgraph]: https://www.npmjs.com/package/@madatdata/db-splitgraph
[npm-react]: https://www.npmjs.com/package/@madatdata/react
[seafowl]: https://seafowl.io
[splitgraph]: https://www.splitgraph.com
[splitgraph-connect-data]: https://www.splitgraph.com/connect/data
[splitgraph-connect-query]: https://www.splitgraph.com/connect/query
[docs-sgr-cli]: https://www.splitgraph.com/docs/sgr-cli/introduction
[docs-web-bridge-api]: https://www.splitgraph.com/docs/query/ddn-http
[strategy-pattern]: https://refactoring.guru/design-patterns/strategy
[github-porsager-postgres]: https://github.com/porsager/postgres
[github-cross-fetch]: https://github.com/lquixada/cross-fetch
[github-node-pg]: https://github.com/brianc/node-postgres
[tsc-multi]: https://github.com/tommy351/tsc-multi
[in-anger]:
  https://english.stackexchange.com/questions/30939/is-used-in-anger-a-britishism-for-something
[splitgraph-graphql-api]: https://api.splitgraph.com/gql/cloud/unified/graphql
[splitgraph-ddn]: https://www.splitgraph.com/connect
[seafowl-flyio]:
  https://seafowl.io/docs/getting-started/tutorial-fly-io/part-2-deploying-to-fly-io
[esm-sh]: https://esm.sh
[observable-esm-example]:
  https://observablehq.com/@milesrichardson/madatdata-esm-splitgraph-client
[seafowl-native-observable-demo]:
  https://observablehq.com/@seafowl/interactive-visualization-demo
[seafowl-observable-client]: https://observablehq.com/@seafowl/client
