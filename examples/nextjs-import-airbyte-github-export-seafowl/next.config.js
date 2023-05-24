const { ProxyAgent, setGlobalDispatcher } = require("undici");

// If running `yarn dev-mitm`, then setup the proxy with MITMPROXY_ADDRESS
// NOTE(FIXME): not all madatdata requests get sent through here for some reason
const setupProxy = () => {
  if (!process.env.MITMPROXY_ADDRESS) {
    return;
  }

  const MITM = process.env.MITMPROXY_ADDRESS;

  console.log("MITM SETUP:", MITM);

  if (!process.env.GLOBAL_AGENT_HTTP_PROXY) {
    process.env["GLOBAL_AGENT_HTTP_PROXY"] = MITM;
  }

  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

  const mitmProxyOpts = {
    uri: MITM,
    connect: {
      rejectUnauthorized: false,
      requestCert: false,
    },
  };

  setGlobalDispatcher(new ProxyAgent(mitmProxyOpts));
};

setupProxy();

module.exports = {};
