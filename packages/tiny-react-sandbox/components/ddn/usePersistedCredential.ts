// import * as React from "react";
import { useCallback, useLayoutEffect, useState } from "react";
const localStorageKey = "madatdata.credential";

export const usePersistedCredential = () => {
  const [credentialState, setCredentialState] = useState<{
    loading: boolean;
    error?: string;
    credential: null | { apiKey?: string; apiSecret?: string };
  }>({
    loading: true,
    credential: null,
  });

  useLayoutEffect(() => {
    const item = localStorage.getItem(localStorageKey);
    if (item) {
      try {
        setCredentialState({ loading: false, credential: JSON.parse(item) });
      } catch {
        setCredentialState({
          loading: false,
          error: "Failed to parse credential",
          credential: null,
        });
      }
    } else {
      setCredentialState({
        loading: false,
        credential: null,
      });
    }
  }, []);

  const setCredential = useCallback(
    (credential: null | { apiKey?: string; apiSecret?: string }) => {
      if (credential === null) {
        localStorage.removeItem(localStorageKey);

        setCredentialState({
          loading: false,
          credential: credential,
        });
      } else {
        const nextCred = {};

        const curCredString = localStorage.getItem(localStorageKey);
        if (curCredString) {
          try {
            Object.assign(nextCred, JSON.parse(curCredString));
          } catch (err) {
            console.warn("error parsing current credential, assuming empty");
          }
        }

        Object.assign(nextCred, credential);
        const nextCredString = JSON.stringify(nextCred);
        localStorage.setItem(localStorageKey, nextCredString);

        setCredentialState({
          loading: false,
          credential: nextCred,
        });
      }
    },
    [setCredentialState]
  );

  return {
    ...credentialState,
    setCredential,
  };
};
