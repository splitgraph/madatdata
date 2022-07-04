import type { Client } from "@madatdata/base-client";
import type { BaseDb } from "@madatdata/base-db";

export interface DataContext<Db extends BaseDb<{}>> {
  client: Client;
  db: Db;
}
