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
  protected plugins: PluginMap<ConcretePluginMap>;
  protected authenticatedCredential?: AuthenticatedCredential;
  protected host: Host;
  protected database: Database;

  constructor(opts: DbOptions<ConcretePluginMap>) {
    this.setAuthenticatedCredential(opts?.authenticatedCredential);
    this.host = opts?.host ?? defaultHost;
    this.database = opts?.database ?? defaultDatabase;
    this.plugins = opts?.plugins ?? {};
  }

  private setAuthenticatedCredential(
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
}
