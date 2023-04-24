import type { HTTPStrategies } from "./types";

export const skipParsingFieldsFromResponse = () => Promise.resolve(null);

export const parseFieldsFromResponseContentTypeHeader: HTTPStrategies["parseFieldsFromResponse"] =
  async ({ response }) => {
    const headers = response.headers;
    const contentType = headers.get("Content-Type");

    if (!contentType) {
      return null;
    }

    try {
      /**
       *
       * application/json; arrow-schema="..."
       *
       * "..."
       *
       *
       * application/json; arrow-schema="{"blah": "foo=bar"}"
       *                                  ^       ^       ^
       * NOTE: By convention of seafowl, these inside double quotes are _not_ escaped,
       * so that we can always slice off the surrounding pair of double quotes and parse
       * the value inside them as JSON.
       *
       * const contentType = `application/json; arrow-schema="{\"blah\\": \"foo=bar; arrow-schema-inner\"}"`
       */
      const quotedJson = contentType
        .split("; arrow-schema=")
        .slice(1)
        .join("; arrow-schema="); // make sure to join it back in case the value itself happens to contain this string

      // slice off the double quote pair that surrounds the entire string
      // NOTE: by convention of Seafowl, the string is _not_ escaped inside these quotes
      const arrowFields = JSON.parse(quotedJson.slice(1, -1));
      return arrowFields satisfies ReturnType<
        HTTPStrategies["parseFieldsFromResponse"]
      >;
    } catch (err) {
      console.warn("Failed to parse fields from Response Content-Type header");
      return null;
    }
  };
