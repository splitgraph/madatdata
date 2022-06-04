import * as React from "react";
import { render } from "react-dom";

const AstDebuggerApp = () => {
  return <h1>Wow such fast HMR! :(D)</h1>;
};

render(<AstDebuggerApp />, document.querySelector("#root"));
