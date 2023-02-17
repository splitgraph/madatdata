import { render } from "../dsx/renderer";

// NOTE: This file can be executed in the browser at /dsx-renderer.html
//       OR via the command line with node www/dist/dsx-renderer.js

const DsxThingRoot = () => {
  return <div>Helo</div>;
};

render(<DsxThingRoot />, {});
