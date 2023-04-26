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
       * application/json; arrow-schema=%7B%22blah%22%3A%22ok%22%7D
       *
       * NOTE: We assume that arrow-schema is the only parameter, and is
       * thus the last one, and so does not terminate with a semi-colon
       */
      const urlencodedJson = contentType
        .split("; arrow-schema=")
        .slice(1)
        .join("; arrow-schema="); // make sure to join it back in case the value itself happens to contain this string

      const decodedJson = decodeURIComponent(urlencodedJson);

      const arrowFields = JSON.parse(decodedJson);
      return arrowFields satisfies ReturnType<
        HTTPStrategies["parseFieldsFromResponse"]
      >;
    } catch (err) {
      console.warn("Failed to parse fields from Response Content-Type header");
      return null;
    }
  };
