import { describe, it, expect } from "vitest";
import { unpackCredential, isAnonymousCredential } from "./credential";

describe("unpackCredential", () => {
  it("returns anonymous credential for null input", () => {
    const unpacked = unpackCredential(null);
    expect(unpacked.anonymous).toEqual(true);
    expect(isAnonymousCredential(unpacked)).toEqual(true);
  });
});
