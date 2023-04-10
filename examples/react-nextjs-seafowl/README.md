# Seafowl + Next.js Example

This is an example of creating a Next.js site that queries
[Seafowl](https://seafowl.io) to generate the content for its pages.

The example references Google Search data for seafowl.io, which was obtained
from the Google Search Console, imported into Splitgraph using the Singer tap
for Google Search, and then exported to Seafowl by calling a GraphQL mutation at
the Splitgraph API. (Note: this is all possible with Madatdata code, but it was
done manually in this case.)

See the data at Splitgraph in the repository
[`miles/splitgraph-seafowl-search-console`](https://www.splitgraph.com/miles/splitgraph-seafowl-search-console)

This is using a hosted Seafowl instance at fly.dev
([read the Seafowl docs: "Deploying to Fly.io"](https://seafowl.io/docs/getting-started/tutorial-fly-io/part-2-deploying-to-fly-io)),
with Cloudflare in front of it at `demo.seafowl.cloud` providing a caching layer
([read the Seafowl docs: "Delivering query results globally with Cloudflare"](https://seafowl.io/docs/getting-started/tutorial-fly-io/part-4-2-cdn-with-cloudflare)).

## Try Now

### Preview Immediately

_No signup required, just click the button!_

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/splitgraph/madatdata/tree/main/examples/react-nextjs-seafowl?file=sql-queries.ts)

[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/splitgraph/madatdata/main/examples/react-nextjs-seafowl?file=sql-queries.ts&hardReloadOnChange=true&startScript=dev&node=16&port=3000)

### Or, deploy to Vercel (signup required)

_Signup, fork the repo, and import it_

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/splitgraph/madatdata/tree/main/examples/react-nextjs-seafowl&project-name=madatdata-seafowl&repository-name=madatdata-nextjs-seafowl)

## Queries

You can find the queries used in [`./sql-queries.ts`](./sql-queries.ts). The
data context is initiated in [`./pages/_app.tsx`](./pages/_app.tsx).

## Page Structure

The reason for using Search data in this example is because it lends itself well
to per-page group-bys, for example a page for each keyword and a page for each
URL.

These could use Incremental Static Regeneration, since many of them are known
ahead of time, but at the moment this demo just showcases using hooks, except
for on the root page that lists available domains and metrics.
