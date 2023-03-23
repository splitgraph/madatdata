import { useCallback, useLayoutEffect, useState } from "react";
const localStorageKey = "madatdata.seafowl_config";

export const usePersistedConfig = () => {
  const [configState, setConfigState] = useState<{
    loading: boolean;
    error?: string;
    config: null | { seafowlUrl?: string; seafowlSecret?: string };
  }>({
    loading: true,
    config: null,
  });

  useLayoutEffect(() => {
    const item = localStorage.getItem(localStorageKey);
    if (item) {
      try {
        setConfigState({ loading: false, config: JSON.parse(item) });
      } catch {
        setConfigState({
          loading: false,
          error: "Failed to parse config",
          config: null,
        });
      }
    } else {
      setConfigState({
        loading: false,
        config: null,
      });
    }
  }, []);

  const setConfig = useCallback(
    (config: null | { seafowlUrl?: string; seafowlSecret?: string }) => {
      if (config === null) {
        localStorage.removeItem(localStorageKey);

        setConfigState({
          loading: false,
          config: config,
        });
      } else {
        const nextCred = {};

        const curCredString = localStorage.getItem(localStorageKey);
        if (curCredString) {
          try {
            Object.assign(nextCred, JSON.parse(curCredString));
          } catch (err) {
            console.warn("error parsing current config, assuming empty");
          }
        }

        Object.assign(nextCred, config);
        const nextCredString = JSON.stringify(nextCred);
        localStorage.setItem(localStorageKey, nextCredString);

        setConfigState({
          loading: false,
          config: nextCred,
        });
      }
    },
    [setConfigState]
  );

  return {
    ...configState,
    setConfig,
  };
};
