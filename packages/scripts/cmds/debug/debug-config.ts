export const getDebugConfig = () => {
  return {
    // inspectorURL: "chrome://inspect/#devices",
    inspectorURL:
      "devtools://devtools/bundled/node_app.html?ws=127.0.0.1:9229/d48ec8d2-8e9a-47be-bf00-1e2c47ea8f0d",
    // inspectorURL: "devtools://devtools/bundled/node_app.html?remoteBase=https://chrome-devtools-frontend.appspot.com/serve_file/@43b08a5db3a57ae8edec5df3fcf5301affeaa3f8/",

    // inspectorURL: "devtools://devtools/bundled/node_app.html",
  };
};

export type DebugConfig = ReturnType<typeof getDebugConfig>;
