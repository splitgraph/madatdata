// This is the root file which is imported by every .generated.ts GraphQL file
// e.g.: import type * as Unified from "../gql-client/unified-types";
// We don't name it types.ts because it only refers to API types (not client-only local code)

export * from "./generated/unified-schema";
export * from "./explicit-types";
