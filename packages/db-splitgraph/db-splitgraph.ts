import { helloWorld } from "@madatdata/base-db";

export const makeDb = () => {
  return {
    dbname: "ddn",
    helloWorld,
  };
};
