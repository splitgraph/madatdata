import type { Client } from "@madatdata/base-client";
import type { BaseDb, PluginList } from "@madatdata/base-db";

export interface DataContext<
  Db extends BaseDb<ConcretePluginList, {}>,
  ConcretePluginList extends PluginList = PluginList
> {
  client: Client;
  db: Db;
}
