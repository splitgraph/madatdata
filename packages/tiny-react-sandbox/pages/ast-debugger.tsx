import { createRoot } from "react-dom/client";

import { DebugQueryAST } from "../components/PgAST/DebugQueryAST";

const AstDebuggerRoot = () => {
  return <DebugQueryAST />;
};

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<AstDebuggerRoot />);
