import { makeSeafowlHTTPContext } from "@madatdata/core";

export const makeAuthenticatedSeafowlHTTPContext = () => {
  const { instanceURL, instanceDatabase, instanceSecret } =
    getRequiredValidAuthenticatedSeafowlInstanceConfig();

  // NOTE: This config object is a mess and will be simplified in a future madatdata update
  // It's only necessary here because we're passing a secret
  return makeSeafowlHTTPContext({
    database: {
      dbname: instanceDatabase,
    },
    authenticatedCredential: {
      token: instanceSecret,
      anonymous: false,
    },
    host: {
      baseUrls: {
        sql: instanceURL,
        gql: "...",
        auth: "...",
      },
      dataHost: new URL(instanceURL).host,
      apexDomain: "...",
      apiHost: "...",
      postgres: {
        host: "127.0.0.1",
        port: 6432,
        ssl: false,
      },
    },
  });
};

const getRequiredValidAuthenticatedSeafowlInstanceConfig = () => {
  const instanceURL = process.env.SEAFOWL_INSTANCE_URL;

  if (!instanceURL) {
    throw new Error("Missing SEAFOWL_INSTANCE_URL");
  }

  // This could be temporary if we want to allow configuring the instance URL,
  // but for now we export to Splitgraph using no instance URL, which means
  // it exports to demo.seafowl.cloud, and we only use this for creating
  // fallback tables on failed exports (which is mostly a workaround anyway)
  if (instanceURL && instanceURL !== "https://demo.seafowl.cloud") {
    throw new Error(`If SEAFOWL_INSTANCE_URL is set, it should be set to https://demo.seafowl.cloud,
    because that's where Splitgraph exports to by default, and we are not currently passing
    any instance URL to the Splitgraph export API (though we could do that).
  `);
  }

  const instanceSecret = process.env.SEAFOWL_INSTANCE_SECRET;
  if (!instanceSecret) {
    throw new Error("Missing SEAFOWL_INSTANCE_SECRET");
  }

  // This is at the config level, just like SPLITGRAPH_NAMESPACE, since the two
  // of them are supposed to match
  const instanceDatabase = process.env.SEAFOWL_INSTANCE_DATABASE;
  if (!instanceDatabase) {
    throw new Error("Missing SEAFOWL_INSTANCE_DATABASE");
  }

  const META_NAMESPACE =
    process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;
  if (!META_NAMESPACE) {
    throw new Error(
      "Missing NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE"
    );
  }

  if (instanceDatabase !== META_NAMESPACE) {
    throw new Error(`SEAFOWL_INSTANCE_DATABASE (${instanceDatabase}) should match
    NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE (${META_NAMESPACE})`);
  }

  return {
    instanceURL,
    instanceSecret,
    instanceDatabase,
  };
};
