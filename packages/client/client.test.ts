import { describe, it, expect } from "vitest";
import { makeClient } from "./client";

describe("makeClient", () => {
  it("should create a new instance of client", () => {
    const client = makeClient({ username: "Mr Fizz Buzz the Fizz" });
    const name = client.hello();

    expect(name).toMatch("Mr Fizz Buzz the Fizz");
  });
});
