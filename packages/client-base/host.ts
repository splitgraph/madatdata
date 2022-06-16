export interface Host {
  apexDomain: string;
  dataHost: string;
  apiHost: string;
  baseUrls: BaseUrls;
}

interface BaseUrls {
  sql: string;
  auth: string;
}

export const defaultHost: Host = {
  apexDomain: "splitgraph.com",
  dataHost: "data.splitgraph.com",
  apiHost: "api.splitgraph.com",
  baseUrls: {
    // NOTE: still needs to append ddn name to path
    sql: "https://data.splitgraph.com/sql/query",
    auth: "https://api.splitgraph.com/auth",
  },
};
