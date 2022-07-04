import { useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { usePersistedCredential } from "./usePersistedCredential";

export const AuthWidget = () => {
  const { setCredential, loading, error, credential } =
    usePersistedCredential();

  const [apiKeyInput, setApiKeyInput] = useState<string | undefined | null>(
    credential?.apiKey
  );
  const [apiSecretInput, setApiSecretInput] = useState<
    string | undefined | null
  >(credential?.apiSecret);

  const onClickSave = useCallback(() => {
    setCredential({
      apiKey: apiKeyInput ?? undefined,
      apiSecret: apiSecretInput ?? undefined,
    });
  }, [setCredential, apiKeyInput, apiSecretInput]);

  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const apiSecretInputRef = useRef<HTMLInputElement>(null);

  const onClickClear = useCallback(() => {
    if (apiKeyInputRef.current) {
      apiKeyInputRef.current.value = "";
      apiKeyInputRef.current.defaultValue = "";
      apiKeyInputRef.current.removeAttribute("value");
    }

    if (apiSecretInputRef.current) {
      apiSecretInputRef.current.value = "";
      apiSecretInputRef.current.defaultValue = "";
      apiSecretInputRef.current.removeAttribute("value");
    }

    setCredential(null);
    setApiKeyInput(null);
    setApiSecretInput(null);
  }, [setCredential, apiKeyInputRef, apiSecretInputRef]);

  const dirtyApiKey = !!apiKeyInput && apiKeyInput !== credential?.apiKey;
  const dirtyApiSecret =
    !!apiSecretInput && apiSecretInput !== credential?.apiSecret;
  const dirtyForm = !loading && (dirtyApiKey || dirtyApiSecret);

  return (
    <WidgetContainer>
      {loading && <>Loading...</>}
      {error && <>Error: {error}</>}
      <div
        className="api-key-input-container"
        style={{ display: "inline-block", marginRight: "2rem" }}
      >
        <label htmlFor="api-key" style={{ display: "block" }}>
          API Key
          {dirtyApiKey && (
            <>
              {" "}
              <em>(unsaved)</em>
            </>
          )}
        </label>
        <input
          id="api-key"
          ref={apiKeyInputRef}
          className="credential-input api-key-input"
          name="api-key"
          type="text"
          placeholder="API Key (DDN Username)"
          disabled={loading}
          defaultValue={credential?.apiKey}
          onChange={(ev) => setApiKeyInput(ev.currentTarget.value)}
          style={{ width: "40ch" }}
        />
      </div>
      <div
        className="api-secret-input-container"
        style={{ display: "inline-block", marginRight: "2rem" }}
      >
        <label htmlFor="api-secret" style={{ display: "block" }}>
          API Secret
          {dirtyApiSecret && (
            <>
              {" "}
              <em>(unsaved)</em>
            </>
          )}
        </label>
        <input
          id="api-secret"
          ref={apiSecretInputRef}
          className="credential-input api-secret-input"
          name="api-secret"
          type="text"
          placeholder="API Secret (DDN Password)"
          disabled={loading}
          defaultValue={credential?.apiSecret}
          onChange={(ev) => setApiSecretInput(ev.currentTarget.value)}
          style={{ width: "40ch" }}
        />
      </div>
      <button
        className="credential-submit-button"
        disabled={!dirtyForm}
        onClick={onClickSave}
      >
        Save
      </button>
      {credential && (
        <button className="credential-delete-button" onClick={onClickClear}>
          Clear
        </button>
      )}
    </WidgetContainer>
  );
};

const WidgetContainer = ({ children }: { children?: ReactNode }) => (
  <div
    style={{
      border: "1px solid #000",
      padding: "2rem",
      backgroundColor: "white",
      margin: "1rem",
    }}
  >
    {children}
  </div>
);
