# End-to-End Example: Use `airbyte-github` to import GitHub repository into Splitgraph, then export it to Seafowl, via Next.js API routes

This is a full end-to-end example demonstrating importing data to Splitgraph
(using the `airbyte-github` plugin), exporting it to Seafowl (using the
`export-to-seafowl` plugin), and then querying it (with `DbSeafowl` and React
hooks from `@madatdata/react`). The importers and exporting of data is triggered
by backend API routes (e.g. the Vecel runtime), which execute in an environment
with secrets (an `API_SECRET` for Splitgraph, and a GitHub access token for
`airbyte-github`). The client side queries Seafowl directly by sending raw SQL
queries in HTP requests, which is what Seafowl is ultimately designed for.

## Try Now

### Preview Immediately

_No signup required, just click the button!_

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/splitgraph/madatdata/tree/main/examples/nextjs-import-airbyte-github-export-seafowl?file=pages/index.tsx)

[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/splitgraph/madatdata/main/examples/nextjs-import-airbyte-github-export-seafowl?file=pages/index.tsx&hardReloadOnChange=true&startScript=dev&node=16&port=3000)

### Or, deploy to Vercel (signup required)

_Signup, fork the repo, and import it_

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/splitgraph/madatdata/tree/main/examples/nextjs-import-airbyte-github-export-seafowl&project-name=madatdata-basic-hooks&repository-name=madatdata-nextjs-basic-hooks)
