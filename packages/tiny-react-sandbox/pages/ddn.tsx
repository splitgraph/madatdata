import * as React from "react";
import { createRoot } from "react-dom/client";

import { DebugDDN } from "../components/ddn/DebugDDN";

const DDNDebuggerRoot = () => {
  return <DebugDDN />;
};

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<DDNDebuggerRoot />);
