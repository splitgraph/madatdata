# Vite: Basic Hooks Example (with Splitgraph)

This example was bootstrapped from the Vite `react-ts` template by following the
[official getting started guide from Vite](https://vitejs.dev/guide/), i.e. by
running:

```bash
yarn create vite react-vite-basic-hooks --template react-ts
```

The default Vite settings should be sufficient for bundling packages from
Madatdata.

## What this example does

Run the example with

```ts
yarn dev
```

This is a basic one page example of the `useSql` hook with Splitgraph.

It displays the raw JSON results of sending a query via HTTP to the following
Splitgraph repository (see [`./src/App.tsx`](./src/App.tsx)):

- [`splitgraph/domestic_us_flights:latest`](https://www.splitgraph.com/splitgraph/domestic_us_flights)

## Try Now

### Preview Immediately

_No signup required, just click the button!_

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/splitgraph/madatdata/tree/main/examples/react-vite-basic-hooks?file=src/App.tsx)

[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/splitgraph/madatdata/main/examples/react-vite-basic-hooks?file=src/App.tsx)
