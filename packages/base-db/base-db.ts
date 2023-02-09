import type { PluginMap, OptionalPluginMap } from "./plugin-bindings";
import { WithPluginRegistry, PluginRegistry } from "./plugin-registry";
import { webcrypto } from "crypto";

import {
  type Client,
  type ClientOptions,
  // TODO: imports below are not related to client, export from "core"(?) instead?
  Credential,
  type AuthenticatedCredential,
  type Database,
  defaultDatabase,
  type Host,
  defaultHost,
} from "@madatdata/base-client";

export interface Db<ConcretePluginMap extends PluginMap> {
  importData: <PluginName extends keyof ConcretePluginMap["importers"]>(
    pluginName: PluginName,
    ...rest: Parameters<
      ConcretePluginMap["importers"][PluginName]["importData"]
    >
  ) => Promise<unknown>;
  exportData: <PluginName extends keyof ConcretePluginMap["exporters"]>(
    pluginName: PluginName,
    ...rest: Parameters<
      ConcretePluginMap["exporters"][PluginName]["exportData"]
    >
  ) => Promise<unknown>;
  makeClient: <ImplementationSpecificClientOptions extends ClientOptions>(
    makeClientForProtocol: (
      wrappedOptions: ImplementationSpecificClientOptions
    ) => Client,
    opts: ImplementationSpecificClientOptions
  ) => Client;
}
export interface DbOptions<ConcretePluginMap extends PluginMap> {
  plugins: OptionalPluginMap<ConcretePluginMap>;
  authenticatedCredential?: AuthenticatedCredential;
  host?: Host;
  database?: Database;
}
export abstract class BaseDb<
  ConcretePluginMap extends PluginMap,
  PluginHostContext extends object
> implements
    Db<ConcretePluginMap>,
    WithPluginRegistry<ConcretePluginMap, PluginHostContext>
{
  public plugins: PluginRegistry<ConcretePluginMap, PluginHostContext>;
  protected authenticatedCredential?: AuthenticatedCredential;
  protected host: Host;
  protected database: Database;
  protected opts: DbOptions<ConcretePluginMap>;

  constructor(opts: DbOptions<ConcretePluginMap>) {
    this.setAuthenticatedCredential(opts?.authenticatedCredential);
    this.host = opts?.host ?? defaultHost;
    this.database = opts?.database ?? defaultDatabase;
    this.plugins = new PluginRegistry(
      {
        importers: {
          ...opts?.plugins.importers,
        },
        exporters: {
          ...opts?.plugins.exporters,
        },
      },
      {}
    );
    this.opts = opts;
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

  public makeClient<ImplementationSpecificClientOptions, Strategies>(
    makeClientForProtocol: (
      wrappedOptions: ImplementationSpecificClientOptions &
        ClientOptions<Strategies>
    ) => Client,
    clientOptions: ImplementationSpecificClientOptions &
      ClientOptions<Strategies>
  ) {
    return makeClientForProtocol({
      database: this.database,
      host: this.host,
      credential: this.authenticatedCredential,
      ...clientOptions,
    });
  }

  abstract importData<PluginName extends keyof ConcretePluginMap["importers"]>(
    pluginName: PluginName,
    ...rest: Parameters<
      ConcretePluginMap["importers"][PluginName]["importData"]
    >
  ): Promise<unknown>;

  abstract exportData<PluginName extends keyof ConcretePluginMap["exporters"]>(
    pluginName: PluginName,
    ...rest: Parameters<
      ConcretePluginMap["exporters"][PluginName]["exportData"]
    >
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
    // In node, we (used to need?) to use the import from the ambient node: module
    // In vitest, really JSDOM, it's a bit of a mix between the two (window is available?)
    // NOTE: Need to test how this will work in a browser bundle which we don't even have yet
    const subtle = (() => {
      if (!window?.crypto?.subtle) {
        if (webcrypto.subtle) {
          return webcrypto.subtle;
        } else {
          throw new Error("Missing webcrypto.subtle");
        }
      } else if (window.crypto.subtle) {
        return window.crypto.subtle;
      } else {
        throw new Error("Missing webcrypto.subtle and window.crypto.subtle");
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
