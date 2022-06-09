import { useSyncExternalStore } from "react";

export const useSqlStore = () => {
  const sqlStore = useSyncExternalStore(
    () => () => {},
    () => undefined
  );
  return sqlStore;
};

export const DSX = () => {};
