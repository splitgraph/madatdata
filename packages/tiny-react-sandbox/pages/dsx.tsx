import * as React from "react";
import { createRoot } from "react-dom/client";

import { DebugDSX } from "../dsx/debugging/DebugDSX";

const DSXDebuggerRoot = () => {
  return <DebugDSX />;
};

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<DSXDebuggerRoot />);
