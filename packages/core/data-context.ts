import type { Client } from "@madatdata/base-client";
import type { BaseDb } from "@madatdata/base-db";

export interface DataContext<
  Db extends BaseDb<{ importers: {}; exporters: {} }, {}>
> {
  client: Client;
  db: Db;
}
