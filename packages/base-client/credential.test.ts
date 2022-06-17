import { describe, it, expect } from "vitest";
import {
  Credential,
  isAnonymousTokenCredential,
  isTokenCredential,
  makeAuthHeaders,
  isKeypairCredential,
  isAuthenticatedTokenCredential,
} from "./credential";

describe("Credential", () => {
  it("returns anonymous credential for null input", () => {
    const cred = Credential(null);
    expect(cred.anonymous).toEqual(true);
    expect(isTokenCredential(cred)).toEqual(true);
    expect(isAnonymousTokenCredential(cred)).toEqual(true);
    expect(isAuthenticatedTokenCredential(cred)).toEqual(false);
    expect(isKeypairCredential(cred)).toEqual(false);
  });

  it("returns anonymous credential for input anonymous : true ", () => {
    const cred = Credential({ anonymous: true, token: "mine" });
    expect(cred.anonymous).toEqual(true);
    expect(isTokenCredential(cred)).toEqual(true);
    expect(isAnonymousTokenCredential(cred)).toEqual(true);
    expect(isAuthenticatedTokenCredential(cred)).toEqual(false);
    expect(isKeypairCredential(cred)).toEqual(false);
    // TODO: We should be using anonymous tokens but it's technically not required
    expect(makeAuthHeaders(cred)).toMatchInlineSnapshot("{}");
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
    const cred = Credential({ token: "xxx" });
    expect(cred.anonymous).toEqual(false);
    expect(isTokenCredential(cred)).toEqual(true);
    expect(isAnonymousTokenCredential(cred)).toEqual(false);
    expect(isAuthenticatedTokenCredential(cred)).toEqual(true);
    expect(isKeypairCredential(cred)).toEqual(false);
  });

  it("returns keypair credential for keypair input", () => {
    const cred = Credential({ apiKey: "xxx", apiSecret: "yyy" });
    expect(cred.anonymous).toEqual(false);
    expect(isKeypairCredential(cred)).toEqual(true);
    expect(isTokenCredential(cred)).toEqual(false);
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
    expect(makeAuthHeaders(Credential(null))).toMatchInlineSnapshot("{}");
  });
});
