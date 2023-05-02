import type { HTTPStrategies } from "./types";

export const skipParsingFieldsFromResponseBodyJSON = () =>
  Promise.resolve(null);

export const parseFieldsFromResponseBodyJSONFieldsKey: HTTPStrategies["parseFieldsFromResponseBodyJSON"] =
  async ({ parsedJSONBody }) => {
    if (!parsedJSONBody || !parsedJSONBody.fields) {
      return null;
    }
    return Promise.resolve(parsedJSONBody.fields);
  };
