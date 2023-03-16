import { createRoot } from "react-dom/client";

import { DebugSeafowl } from "../components/seafowl/DebugSeafowl";

const SeafowlDebuggerRoot = () => {
  return <DebugSeafowl />;
};

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<SeafowlDebuggerRoot />);
