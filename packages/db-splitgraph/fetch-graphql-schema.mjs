import "cross-fetch/dist/node-polyfill.js";
import { getIntrospectionQuery, buildClientSchema } from "graphql";

// NOTE: Not currently being used by codegen
const fetchSchema = async () => {
  const introspectionQuery = getIntrospectionQuery();
  const { data } = await fetch(
    "https://api.splitgraph.com/gql/cloud/unified/graphql",
    {
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: introspectionQuery }),
      method: "POST",
    }
  ).then((response) => response.json());

  console.log(data);

  return buildClientSchema(data);
};

export default fetchSchema;
