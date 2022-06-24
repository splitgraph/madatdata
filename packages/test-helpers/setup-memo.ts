import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";

/**
 * Setup a basic memoizer that can keep count and store values
 * (it's literally an array, kinda silly but the opaque interface is nice)
 */
export const setupMemo = () => {
  beforeAll((suiteCtx) => {
    suiteCtx.suiteMemo = new Memo();
  });

  beforeEach((testCtx) => {
    testCtx.testMemo = new Memo();
  });

  afterEach((testCtx) => {
    testCtx.testMemo?.reset();
  });
  afterAll((suiteCtx) => {
    suiteCtx.suiteMemo?.reset();
  });
};

class Memo<T = any> {
  private items: T[] = [];

  public takeNext(value?: T) {
    if (typeof value === "undefined") {
      value = this.items.length as unknown as T;
    }

    return this.items.push(value) - 1;
  }

  public get count() {
    return this.items.length;
  }

  public get last() {
    return this.items.length - 1;
  }

  public findMemo(index: number) {
    return this.items[index];
  }

  public set(index: number, value?: T) {
    this.items[index] = value as unknown as T;
  }

  public reset() {
    this.items = [];
  }
}

declare module "vitest" {
  export interface Suite {
    suiteMemo?: Memo;
  }
  export interface TestContext {
    testMemo?: Memo;
  }
}
