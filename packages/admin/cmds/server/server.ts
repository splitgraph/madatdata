import { getServerName } from "../../lib/server";

export const startServer = async () => {
  console.log("Starting server...", getServerName());

  return Promise.resolve();
};
