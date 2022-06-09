interface ClientOptions {
  username: string;
}

class SplitgraphHTTPClient {
  private username: string;

  constructor(args: ClientOptions) {
    this.username = args.username;
  }

  hello() {
    return this.username;
  }
}

export const makeClient = (args: ClientOptions) => {
  const client = new SplitgraphHTTPClient(args);
  return client;
};
