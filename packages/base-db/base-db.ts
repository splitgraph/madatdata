import type { PluginMap } from "./plugin-bindings";

// TODO: These are not related to client, should be exported from "core"?
import {
  Credential,
  type AuthenticatedCredential,
  type Database,
  defaultDatabase,
  type Host,
  defaultHost,
} from "@madatdata/base-client";

export interface Db<ConcretePluginMap extends PluginMap> {
  plugins: PluginMap<ConcretePluginMap>;
  importData: <PluginName extends keyof ConcretePluginMap>(
    pluginName: PluginName,
    ...rest: Parameters<ConcretePluginMap[PluginName]["importData"]>
  ) => Promise<unknown>;
}
export interface DbOptions<ConcretePluginMap extends PluginMap> {
  plugins: ConcretePluginMap;
  authenticatedCredential?: AuthenticatedCredential;
  host?: Host;
  database?: Database;
}
export abstract class BaseDb<ConcretePluginMap extends PluginMap>
  implements Db<ConcretePluginMap>
{
  public plugins: PluginMap<ConcretePluginMap>;
  protected authenticatedCredential?: AuthenticatedCredential;
  protected host: Host;
  protected database: Database;

  constructor(opts: DbOptions<ConcretePluginMap>) {
    this.setAuthenticatedCredential(opts?.authenticatedCredential);
    this.host = opts?.host ?? defaultHost;
    this.database = opts?.database ?? defaultDatabase;
    this.plugins = opts?.plugins ?? {};
  }

  public setAuthenticatedCredential(
    maybeAuthenticatedCredential: DbOptions<ConcretePluginMap>["authenticatedCredential"]
  ) {
    if (typeof maybeAuthenticatedCredential !== "undefined") {
      const parsedCredential = Credential(maybeAuthenticatedCredential);
      if (parsedCredential.anonymous) {
        throw new Error("Error: authenticatedCredential is anonymous or null");
      }
      this.authenticatedCredential = parsedCredential;
    }
  }

  abstract importData<PluginName extends keyof ConcretePluginMap>(
    pluginName: PluginName,
    ...rest: Parameters<ConcretePluginMap[PluginName]["importData"]>
  ): Promise<unknown>;

  /**
   * Return a fingerprint and normalized query (used as input to the fingerprint)
   * for a given SQL string. Default to SHA-256 and normalizing for HTTP headers.
   */
  public async fingerprintQuery(
    sql: string,
    algorithm: AlgorithmIdentifier = "SHA-256",
    normalizeQuery: (sql: string) => string = this.normalizeQueryForHTTPHeader
  ) {
    // In a browser, window.webcrypto.subtle should be available
    // In node, we need to use the import from the ambient node: module
    // In vitest, really JSDOM, it's a bit of a mix between the two (window is available?)
    // NOTE: Need to test how this will work in a browser bundle which we don't even have yet
    const subtle = await (async () => {
      if (typeof window === "undefined" || !window.crypto) {
        const { webcrypto } = await import("node:crypto");
        return webcrypto.subtle;
      } else {
        return window.crypto.subtle;
      }
    })();

    const normalized = normalizeQuery(sql);

    const digest = await subtle.digest(
      algorithm,
      new TextEncoder().encode(normalized)
    );

    const fingerprint = [...new Uint8Array(digest)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");

    return { normalized, fingerprint };
  }

  /**
   * Normalize SQL to be a valid HTTP header and stable fingerprinting input.
   *
   * NOTE: To maximize caching semantics, if the normalized result is used to
   * fingerprint a query, it should also be used to execute the query.
   */
  public normalizeQueryForHTTPHeader(sql: string) {
    return sql.trim().replace(/(?:\r\n|\r|\n)/g, " ");
  }
}

declare module "node:crypto" {
  namespace webcrypto {
    const subtle: SubtleCrypto;
  }
}
