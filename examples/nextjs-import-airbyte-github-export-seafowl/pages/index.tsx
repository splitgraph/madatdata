import { SqlProvider, makeSplitgraphHTTPContext } from "@madatdata/react";
import { useMemo } from "react";

import { BaseLayout } from "../components/BaseLayout";

import { Sidebar, type GitHubRepository } from "../components/Sidebar";
import { Stepper } from "../components/ImportExportStepper/Stepper";

const SplitgraphSampleQuery = () => {
  const splitgraphDataContext = useMemo(
    () => makeSplitgraphHTTPContext({ credential: null }),
    []
  );

  // Uses splitgraph.com by default (anon access supported for public data)
  return (
    <SqlProvider dataContext={splitgraphDataContext}>
      <BaseLayout sidebar={<Sidebar repositories={sampleRepositories} />}>
        <Stepper />
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
