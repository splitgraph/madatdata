import { useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";

// https://github.com/hannoeru/vite-plugin-pages/blob/main/client.d.ts
// https://github.com/microsoft/TypeScript/issues/38638
import { dataContext } from "sql:arbitrary-name-for-some-context";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <pre>{JSON.stringify(dataContext, null, 2)}</pre>
      <div>
        <a href="https://vitejs.dev" target="_blank"></a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}

export default App;
