// type utilities for making assertions about types, which can generally be
// dropped into any file that typescript will compile but not execute, although
// if it's fine to execute, then a "test" file is a natural place for these (even
// if it only contains a single test, or none at all)
//
// NOTE: Most of the types in this file were originally copied from:
// https://github.com/total-typescript/advanced-patterns-workshop/
// blob/06a4151824a980b399d3e4e9387acae450e52870/src/helpers/type-utils.ts
//
export type Expect<T extends true> = T;
export type ExpectTrue<T extends true> = T;
export type ExpectFalse<T extends false> = T;
export type IsTrue<T extends true> = T;
export type IsFalse<T extends false> = T;

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? true
  : false;
export type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true;

// https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360
export type IsAny<T> = 0 extends 1 & T ? true : false;
export type NotAny<T> = true extends IsAny<T> ? false : true;

export type Debug<T> = { [K in keyof T]: T[K] };
export type MergeInsertions<T> = T extends object
  ? { [K in keyof T]: MergeInsertions<T[K]> }
  : T;

export type Alike<X, Y> = Equal<MergeInsertions<X>, MergeInsertions<Y>>;

export type ExpectExtends<VALUE, EXPECTED> = EXPECTED extends VALUE
  ? true
  : false;
export type ExpectValidArgs<
  FUNC extends (...args: any[]) => any,
  ARGS extends any[]
> = ARGS extends Parameters<FUNC> ? true : false;

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
/**
 * Helper function that can be used for inserting test assertions into tests
 *
 * For example usage:
 * https://github.com/search?q=repo%3Atotal-typescript%2Fadvanced-patterns-workshop%20donotexecute&type=code
 */
export const doNotExecute = (_func: () => void) => {};

//
// NOTE: Code below here was NOT copied from advancd-patterns-workshop
//

// // https://dev.to/ecyrbe/how-to-unit-test-your-typescript-utility-types-3cnm
// type Assert<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U
//   ? 1
//   : 2
//   ? true
//   : { error: "Types are not equal"; type1: T; type2: U };

//
// Debugging helpers, probably not used directly
// Copied from some StackOverfow answer at a URL that has since been lost to history
//
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
export type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;
export type ExpandFunction<F extends Function> = F extends (
  ...args: infer A
) => infer R
  ? (...args: Expand<A>) => Expand<R>
  : never;
