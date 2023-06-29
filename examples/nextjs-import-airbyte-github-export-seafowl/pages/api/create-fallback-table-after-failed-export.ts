import type { NextApiRequest, NextApiResponse } from "next";
import { makeAuthenticatedSeafowlHTTPContext } from "../../lib/backend/seafowl-db";
import type {
  CreateFallbackTableForFailedExportRequestShape,
  CreateFallbackTableForFailedExportResponseData,
} from "../../types";

/**
 curl -i \
  -H "Content-Type: application/json" http://localhost:3000/api/create-fallback-table-after-failed-export \
  -d '{ "taskId": "2923fd6f-2197-495a-9df1-2428a9ca8dee" }'
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateFallbackTableForFailedExportResponseData>
) {
  const { fallbackCreateTableQuery, destinationSchema, destinationTable } =
    req.body as CreateFallbackTableForFailedExportRequestShape;

  const errors = [];

  if (!fallbackCreateTableQuery) {
    errors.push("missing fallbackCreateTableQuery in request body");
  }

  if (!destinationSchema) {
    errors.push("missing destinationSchema in request body");
  }

  if (!destinationTable) {
    errors.push("missing destinationTable in request body");
  }

  if (typeof fallbackCreateTableQuery !== "string") {
    errors.push("invalid fallbackCreateTableQuery in request body");
  }

  if (typeof destinationSchema !== "string") {
    errors.push("invalid destinationSchema in request body");
  }

  if (!fallbackCreateTableQuery.includes(destinationSchema)) {
    errors.push("fallbackCreateTableQuery must include destinationSchema");
  }

  if (typeof destinationTable !== "string") {
    errors.push("invalid destinationTable in request body");
  }

  if (!fallbackCreateTableQuery.includes(destinationTable)) {
    errors.push("fallbackCreateTableQuery must include destinationTable");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(", "), success: false });
    return;
  }

  try {
    await createFallbackTable(
      req.body as CreateFallbackTableForFailedExportRequestShape
    );
    res.status(200).json({ success: true });
    return;
  } catch (err) {
    console.trace(err);
    res.status(400).json({ error: err.message, success: false });
  }
}

const createFallbackTable = async ({
  fallbackCreateTableQuery,
  destinationTable,
  destinationSchema,
}: CreateFallbackTableForFailedExportRequestShape) => {
  const { client } = makeAuthenticatedSeafowlHTTPContext();

  // NOTE: client.execute should never throw (on error it returns an object including .error)
  // i.e. Even if the table doesn't exist, or if the schema already existed, we don't need to try/catch
  await client.execute(
    `DROP TABLE IF EXISTS "${destinationSchema}"."${destinationTable}";`
  );
  await client.execute(`CREATE SCHEMA "${destinationSchema}";`);
  await client.execute(fallbackCreateTableQuery);
};
