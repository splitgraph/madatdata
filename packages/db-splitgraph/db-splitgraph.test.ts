import { describe, it, expect } from "vitest";
import { makeDb } from "./db-splitgraph";

describe("makeDb creates a database which", () => {
  it('has dbname set to "ddn"', () => {
    const db = makeDb();
    expect(db.dbname).toEqual("ddn");
  });

  it("has property helloWorld from base-db which returns hello world", () => {
    const db = makeDb();
    expect(db.helloWorld()).toEqual("hello world");
  });
});
