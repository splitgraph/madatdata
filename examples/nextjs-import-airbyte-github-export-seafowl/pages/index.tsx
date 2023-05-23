import {
  SqlProvider,
  useSql,
  makeSplitgraphHTTPContext,
} from "@madatdata/react";
import { useMemo } from "react";

import { BaseLayout } from "../components/BaseLayout";

import { Sidebar, type GitHubRepository } from "../components/Sidebar";

const ExampleComponentUsingSQL = () => {
  const { loading, error, response } = useSql<{
    origin_airport: string;
    destination_airport: string;
    origin_city: string;
    destination_city: string;
    passengers: number;
    seats: number;
    flights: number;
    distance: number;
    fly_month: string;
    origin_pop: number;
    destination_pop: number;
    id: number;
  }>(
    `SELECT
    "origin_airport",
    "destination_airport",
    "origin_city",
    "destination_city",
    "passengers",
    "seats",
    "flights",
    "distance",
    "fly_month",
    "origin_pop",
    "destination_pop",
    "id"
FROM
    "splitgraph/domestic_us_flights:latest"."flights"
LIMIT 100;`
  );

  return (
    <pre
      style={{ minWidth: "100%", minHeight: 500 }}
      data-testid={`result-pre-${
        loading ? "loading" : response ? "pass" : error ? "fail" : "unknown"
      }`}
    >
      {JSON.stringify({ loading, error, response }, null, 2)}
    </pre>
  );
};

const SplitgraphSampleQuery = () => {
  const splitgraphDataContext = useMemo(
    () => makeSplitgraphHTTPContext({ credential: null }),
    []
  );

  // Uses splitgraph.com by default (anon access supported for public data)
  return (
    <SqlProvider dataContext={splitgraphDataContext}>
      <BaseLayout sidebar={<Sidebar repositories={sampleRepositories} />}>
        <ExampleComponentUsingSQL />
      </BaseLayout>
    </SqlProvider>
  );
};

export default SplitgraphSampleQuery;

const sampleRepositories: GitHubRepository[] = [
  { namespace: "OpenTech", repository: "data-structures" },
  { namespace: "AiSolutions", repository: "machine-learning-api" },
  { namespace: "DevToolsInc", repository: "react-components" },
  { namespace: "QuantumComputing", repository: "quantum-algorithms" },
  { namespace: "GlobalNetworks", repository: "network-optimization" },
  { namespace: "CyberSec", repository: "firewall-config" },
  { namespace: "DataSci", repository: "data-analysis" },
  { namespace: "WebDevCo", repository: "responsive-templates" },
  { namespace: "CloudNet", repository: "cloud-infrastructure" },
  { namespace: "AiData", repository: "neural-networks" },
  { namespace: "DistributedSys", repository: "microservices-arch" },
  { namespace: "KernelDev", repository: "os-development" },
  { namespace: "FrontEndMagic", repository: "vue-utilities" },
  { namespace: "BackEndLogix", repository: "nodejs-server" },
  { namespace: "Securitech", repository: "encryption-utils" },
  { namespace: "FullStack", repository: "end-to-end-app" },
  { namespace: "DBMasters", repository: "database-design" },
  { namespace: "MobileApps", repository: "android-development" },
  { namespace: "GameFactory", repository: "game-engine" },
  { namespace: "WebAssembly", repository: "wasm-runtime" },
  { namespace: "RoboLogic", repository: "robot-navigation" },
  { namespace: "IoTDesign", repository: "iot-devices" },
  { namespace: "BlockchainTech", repository: "blockchain-network" },
  { namespace: "CryptoCoins", repository: "cryptocurrency" },
  { namespace: "VRWorld", repository: "vr-applications" },
];
