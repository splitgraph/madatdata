import type { Client, ClientOptions } from "@madatdata/base-client";
import type { BaseDb, DbOptions, PluginList } from "@madatdata/base-db";

export interface DataContext<
  Db extends BaseDb<ConcretePluginList, {}>,
  ConcretePluginList extends PluginList = Db["plugins"]["plugins"]
> {
  client: Client;
  db: Db;
}

export type DataContextOptions<
  Db extends BaseDb<ConcretePluginList, {}>,
  ConcretePluginList extends PluginList = Db["plugins"]["plugins"],
  ConcreteDbOptions = DbOptions<ConcretePluginList>
> = Readonly<
  {
    client?: ClientOptions;
    db?: ConcreteDbOptions;
  } & Partial<Omit<ClientOptions & ConcreteDbOptions, "client" | "db">>
>;
