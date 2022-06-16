import { makeClient } from "@madatdata/client";

const client = makeClient({ credential: null });

console.log("client:");
console.log(JSON.stringify(client, null, 2));
