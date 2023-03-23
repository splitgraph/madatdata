import { createRoot } from "react-dom/client";

import { SeafowlSampleQuery } from "../components/seafowl-hooks/SeafowlHooksExample";

const SeafowlHooksRoot = () => {
  return <SeafowlSampleQuery />;
};

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<SeafowlHooksRoot />);
