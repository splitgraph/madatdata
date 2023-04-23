import type { HTTPStrategies } from "../client-http";

export const parseFieldsFromResponseContentTypeHeader: HTTPStrategies["parseFieldsFromResponse"] = async ({ response }) => {
  const headers = response.headers;
  const contentType = headers.get("Content-Type");

  if (!contentType) {
    throw new Error("no content-type header");
  }

  /**
   *
   * application/json; arrow-schema="..."
   *
   * "..."
   *
   *
   * application/json; arrow-schema="{\"blah\": \"foo=bar\"}"
   *
   * for paste into node, add double slash
   *
   * const contentType = `application/json; arrow-schema="{\\"blah\\": \\"foo=bar; arrow-schema-inner\\"}"`
   */
  const quotedJson = contentType
    .split("; arrow-schema")
    .slice(1)
    .join("; arrow-schema")
    .split("=")
    .slice(1)
    .join("=");

  // It's escaped, so parse it twice (once to a string, then once to an object)
  const arrowFields = JSON.parse(JSON.parse(quotedJson));

  return arrowFields satisfies ReturnType<HTTPStrategies["parseFieldsFromResponse"]>
}
