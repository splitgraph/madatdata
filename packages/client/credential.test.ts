import { describe, it, expect } from "vitest";
import {
  Credential,
  isAnonymousTokenCredential,
  isTokenCredential,
  makeAuthHeaders,
  isKeypairCredential,
} from "./credential";

describe("Credential", () => {
  it("returns anonymous credential for null input", () => {
    const unpacked = Credential(null);
    expect(unpacked.anonymous).toEqual(true);
    expect(isAnonymousTokenCredential(unpacked)).toEqual(true);
    expect(isTokenCredential(unpacked)).toEqual(true);
  });

  it("throws error for empty object input", () => {
    expect(() =>
      Credential(
        // @ts-expect-error {} should lead to an unassignable type error
        {}
      )
    ).toThrowErrorMatchingInlineSnapshot('"Unexpected credentialType"');
  });

  it("returns token credential with anonymous = false for token input", () => {
    const unpacked = Credential({ token: "xxx" });
    expect(unpacked.anonymous).toEqual(false);
    expect(isAnonymousTokenCredential(unpacked)).toEqual(false);
    expect(isTokenCredential(unpacked)).toEqual(true);
  });

  it("returns keypair credential for keypair input", () => {
    const unpacked = Credential({ apiKey: "xxx", apiSecret: "yyy" });
    expect(unpacked.anonymous).toEqual(false);
    expect(isKeypairCredential(unpacked)).toEqual(true);
    expect(isTokenCredential(unpacked)).toEqual(false);
  });
});

describe("makeAuthHeaders", () => {
  it("returns Authorization header for token credential", () => {
    expect(makeAuthHeaders(Credential({ token: "xxx" })))
      .toMatchInlineSnapshot(`
      {
        "Authorization": "Bearer xxx",
      }
    `);
  });

  it("returns X-API-Key and X-API-Secret headers for keypair credential", () => {
    expect(makeAuthHeaders(Credential({ apiKey: "xxx", apiSecret: "yyy" })))
      .toMatchInlineSnapshot(`
      {
        "X-API-Key": "xxx",
        "X-API-Secret": "yyy",
      }
    `);
  });

  it("returns Authorization header for anonymous credential", () => {
    // TODO: "anonymous-token" is currently a hardcoded placeholder
    expect(makeAuthHeaders(Credential(null))).toMatchInlineSnapshot(`
      {
        "Authorization": "Bearer anonymous-token",
      }
    `);
  });
});
