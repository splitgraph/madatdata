import * as React from "react";
import { createRoot } from "react-dom/client";

const AstDebuggerApp = () => {
  return <h1>Wow such fast HMR! :(D)</h1>;
};

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<AstDebuggerApp />);
