/// <reference types="vite/client" />

// https://github.com/microsoft/TypeScript/issues/38638
// https://stackoverflow.com/a/61834580

declare module "sql:*" {
  // https://github.com/microsoft/TypeScript/issues/28097#issuecomment-489614625
  // note: hard to get much more typesafety than this (e.g. based on the import name)
  export const dataContext: { id: string };
}
