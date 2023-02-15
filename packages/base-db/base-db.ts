import type { Plugin } from "./plugin-bindings";
import {
  WithPluginRegistry,
  PluginRegistry,
  PluggableInterfaceShape,
  PluginList,
  ExtractPlugin,
} from "./plugin-registry";
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

export interface ImportPlugin extends Plugin {
  importData: (
    sourceOptions: any,
    destOptions: any
  ) => Promise<{ response: any | null; error: any | null; info?: any | null }>;
}

// interface ImportPluginWithOptions extends ImportPlugin {
//   withOptions: WithOptions<ImportPlugin>;
// }

export interface ExportPlugin extends Plugin {
  exportData: (
    sourceOptions: any,
    destOptions: any
  ) => Promise<{ response: any | null; error: any | null; info?: any | null }>;
}

// interface ExportPluginWithOptions extends ExportPlugin {
//   withOptions: WithOptions<ExportPlugin>;
// }

export interface DbPluggableInterface<ConcretePluginList extends PluginList>
  extends PluggableInterfaceShape {
  importData: <MatchingPlugin extends ImportPluginFromList<ConcretePluginList>>(
    ...importDataArgsForPlugin: Parameters<MatchingPlugin["importData"]>
  ) => Promise<unknown>;
  exportData: <MatchingPlugin extends ExportPluginFromList<ConcretePluginList>>(
    ...exportDataArgsForPlugin: Parameters<MatchingPlugin["exportData"]>
  ) => Promise<unknown>;
}

export interface Db<ConcretePluginList extends PluginList> {
  importData: <MatchingPlugin extends ImportPluginFromList<ConcretePluginList>>(
    pluginName: MatchingPlugin["__name"],
    ...rest: Parameters<MatchingPlugin["importData"]>
  ) => Promise<unknown>;
  exportData: <MatchingPlugin extends ExportPluginFromList<ConcretePluginList>>(
    pluginName: MatchingPlugin["__name"],
    ...rest: Parameters<MatchingPlugin["exportData"]>
  ) => Promise<unknown>;
  makeClient: <ImplementationSpecificClientOptions extends ClientOptions>(
    makeClientForProtocol: (
      wrappedOptions: ImplementationSpecificClientOptions
    ) => Client,
    opts: ImplementationSpecificClientOptions
  ) => Client;
}

export type ImportPluginFromList<
  ConcretePluginList extends PluginList,
  PluginName extends ExtractPlugin<
    ConcretePluginList,
    ImportPlugin
  >["__name"] = string
> = ExtractPlugin<ConcretePluginList, ImportPlugin & { __name: PluginName }>;

export type ExportPluginFromList<
  ConcretePluginList extends PluginList,
  PluginName extends ExtractPlugin<
    ConcretePluginList,
    ExportPlugin
  >["__name"] = string
> = ExtractPlugin<ConcretePluginList, ExportPlugin & { __name: PluginName }>;

export interface DbOptions<ConcretePluginList extends PluginList> {
  plugins: ConcretePluginList;
  authenticatedCredential?: AuthenticatedCredential;
  host?: Host;
  database?: Database;
}
export abstract class BaseDb<
  ConcretePluginList extends PluginList,
  PluginHostContext extends object
> implements
    Db<ConcretePluginList>,
    WithPluginRegistry<
      ConcretePluginList,
      PluginHostContext,
      DbPluggableInterface<ConcretePluginList>
    >
{
  public plugins: PluginRegistry<
    ConcretePluginList,
    PluginHostContext,
    DbPluggableInterface<ConcretePluginList>
  >;
  protected authenticatedCredential?: AuthenticatedCredential;
  protected host: Host;
  protected database: Database;
  protected opts: DbOptions<ConcretePluginList>;

  constructor(opts: DbOptions<ConcretePluginList>) {
    this.setAuthenticatedCredential(opts?.authenticatedCredential);
    this.host = opts?.host ?? defaultHost;
    this.database = opts?.database ?? defaultDatabase;

    this.plugins = new PluginRegistry(opts.plugins, {} as PluginHostContext);
    this.opts = opts;
  }

  public setAuthenticatedCredential(
    maybeAuthenticatedCredential: DbOptions<ConcretePluginList>["authenticatedCredential"]
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

  abstract importData<
    PluginName extends ImportPluginFromList<
      ConcretePluginList,
      string
    >["__name"],
    MatchingPlugin extends ImportPluginFromList<ConcretePluginList, PluginName>
  >(
    pluginName: PluginName,
    ...rest: Parameters<MatchingPlugin["importData"]>
  ): Promise<unknown>;

  abstract exportData<
    PluginName extends ExportPluginFromList<
      ConcretePluginList,
      string
    >["__name"],
    MatchingPlugin extends ExportPluginFromList<ConcretePluginList, PluginName>
  >(
    pluginName: PluginName,
    ...rest: Parameters<MatchingPlugin["exportData"]>
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
