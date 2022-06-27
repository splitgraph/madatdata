import { afterEach, beforeEach } from "vitest";

/**
 * Setup a basic memoizer so that (for example) msw resolvers in `beforeEach()`
 * and test assertions in `it()` can share objects to make asertions about
 * intermediate values that were part of the request but not necessarily exposed
 * by the return value of the function under test.
 */
export const setupMemo = () => {
  const memos = new Map<string | string[], MemoMap>();

  const makeUseMemo = (memoId: string | string[]) => {
    return <MapKey, MapVal>(
      ...mapInit: ConstructorParameters<typeof MemoMap<MapKey, MapVal>>
    ) => {
      if (Array.isArray(memoId)) {
        memoId = memoId.join(";");
      }

      if (!memos.has(memoId)) {
        memos.set(memoId, new MemoMap<MapKey, MapVal>(...mapInit));
      }
      return memos.get(memoId) as MemoMap<MapKey, MapVal>;
    };
  };

  beforeEach((testCtx) => {
    const useMemo = makeUseMemo(testCtx.meta.id);
    testCtx.useTestMemo = useMemo;

    testCtx.useKeyedMemo = (memoKey: string) =>
      makeUseMemo([testCtx.meta.id, memoKey])();
  });

  afterEach((testCtx) => {
    for (let memoId of memos.keys()) {
      if (typeof memoId === "string" && memoId === testCtx.meta.id) {
        memos.delete(memoId);
      }
    }
  });
};

class MemoMap<MemoKey = unknown, MemoVal = unknown> extends Map<
  MemoKey,
  MemoVal
> {
  // implements IMemoMap<MemoKey, MemoVal>
  constructor(...args: ConstructorParameters<typeof Map<MemoKey, MemoVal>>) {
    super(...args);
  }

  /**
   * Set an item in the map with a random ID, useful for when "preallocating"
   * space in the map if the id is needed but the data is not yet known
   */
  public setWithRandomId(
    ...args: DropFirst<Parameters<Map<string, MemoVal>["set"]>>
  ) {
    const unsafeRandomId = Math.floor(
      Math.random() * (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER) +
        Number.MAX_SAFE_INTEGER
    ).toString();

    // NOTE: unsafeRandomId will always be string, but user may have inserted
    // keys with other type into Map, which could be unsafe if done unawares.
    this.set(unsafeRandomId as unknown as MemoKey, ...args);

    return unsafeRandomId;
  }

  /**
   * Return the key of the "last" item in the iterable Map, which generally
   * indicates the most recently set key in the map, or in the iterable provided
   * to the Map's constructor.
   */
  public get lastKey() {
    return Array.from(this.keys()).pop();
  }

  /**
   * Return the "last" (most recently set) item from the map
   * @see MemoMap.lastKey()
   */
  public get last() {
    if (typeof this.lastKey === "undefined") {
      return undefined;
    }

    return this.get(this.lastKey);
  }
}

declare module "vitest" {
  export interface TestContext {
    /**
     * Call this function to get a Map associated with the current testId
     */
    useTestMemo?: <MapKey, MapVal>() => MemoMap<MapKey, MapVal>;
    /**
     * Call this function to get a Map associated with the current testId,
     * concatenated with the passed memoKey. Use in tests with multiple memos.
     */
    useKeyedMemo?: <MapKey, MapVal>(memoKey: string) => MemoMap<MapKey, MapVal>;
  }
}

// https://stackoverflow.com/a/63029283
type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
