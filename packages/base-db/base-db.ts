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
  importData: <PluginName extends keyof ConcretePluginMap>(
    pluginName: PluginName,
    sourceOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[0],
    destOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[1]
  ) => Promise<unknown>;
}
export interface DbOptions {
  authenticatedCredential?: AuthenticatedCredential;
  host?: Host;
  database?: Database;
}

export abstract class BaseDb<ConcretePluginMap extends PluginMap>
  implements Db<ConcretePluginMap>
{
  protected authenticatedCredential?: AuthenticatedCredential;
  protected host: Host;
  protected database: Database;

  constructor(opts?: DbOptions) {
    this.setAuthenticatedCredential(opts?.authenticatedCredential);
    this.host = opts?.host ?? defaultHost;
    this.database = opts?.database ?? defaultDatabase;
  }

  private setAuthenticatedCredential(
    maybeAuthenticatedCredential: DbOptions["authenticatedCredential"]
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
    sourceOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[0],
    destOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[1]
  ): Promise<unknown>;
}
