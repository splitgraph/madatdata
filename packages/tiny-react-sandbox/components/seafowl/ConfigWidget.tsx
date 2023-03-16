import { useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { usePersistedConfig } from "./usePersistedConfig";

export const ConfigWidget = () => {
  const { setConfig, loading, error, config } = usePersistedConfig();

  const [seafowlUrlInput, setSeafowlUrlInput] = useState<
    string | undefined | null
  >(config?.seafowlUrl);
  const [seafowlSecretInput, setSeafowlSecretInput] = useState<
    string | undefined | null
  >(config?.seafowlSecret);

  const onClickSave = useCallback(() => {
    setConfig({
      seafowlUrl: seafowlUrlInput ?? undefined,
      seafowlSecret: seafowlSecretInput ?? undefined,
    });
  }, [setConfig, seafowlUrlInput, seafowlSecretInput]);

  const seafowlUrlInputRef = useRef<HTMLInputElement>(null);
  const seafowlSecretInputRef = useRef<HTMLInputElement>(null);

  const onClickClear = useCallback(() => {
    if (seafowlUrlInputRef.current) {
      seafowlUrlInputRef.current.value = "";
      seafowlUrlInputRef.current.defaultValue = "";
      seafowlUrlInputRef.current.removeAttribute("value");
    }

    if (seafowlSecretInputRef.current) {
      seafowlSecretInputRef.current.value = "";
      seafowlSecretInputRef.current.defaultValue = "";
      seafowlSecretInputRef.current.removeAttribute("value");
    }

    setConfig(null);
    setSeafowlUrlInput(null);
    setSeafowlSecretInput(null);
  }, [setConfig, seafowlUrlInputRef, seafowlSecretInputRef]);

  const dirtySeafowlUrl =
    !!seafowlUrlInput && seafowlUrlInput !== config?.seafowlUrl;
  const dirtySeafowlSecret =
    !!seafowlSecretInput && seafowlSecretInput !== config?.seafowlSecret;
  const dirtyForm = !loading && (dirtySeafowlUrl || dirtySeafowlSecret);

  return (
    <WidgetContainer>
      {loading && <>Loading...</>}
      {error && <>Error: {error}</>}
      <div
        className="seafowl-url-input-container"
        style={{ display: "inline-block", marginRight: "2rem" }}
      >
        <label htmlFor="seafowl-url" style={{ display: "block" }}>
          Seafowl URL (omit the /q)
          {dirtySeafowlUrl && (
            <>
              {" "}
              <em>(unsaved)</em>
            </>
          )}
        </label>
        <input
          id="seafowl-url"
          ref={seafowlUrlInputRef}
          className="config-input seafowl-url-input"
          name="seafowl-url"
          type="text"
          placeholder="Seafowl URL (Omit the /q)"
          disabled={loading}
          defaultValue={config?.seafowlUrl}
          onChange={(ev) => setSeafowlUrlInput(ev.currentTarget.value)}
          style={{ width: "40ch" }}
        />
      </div>
      <div
        className="seafowl-secret-input-container"
        style={{ display: "inline-block", marginRight: "2rem" }}
      >
        <label htmlFor="seafowl-secret" style={{ display: "block" }}>
          Seafowl Secret (only sent with POST requests)
          {dirtySeafowlSecret && (
            <>
              {" "}
              <em>(unsaved)</em>
            </>
          )}
        </label>
        <input
          id="seafowl-secret"
          ref={seafowlSecretInputRef}
          className="config-input seafowl-secret-input"
          name="seafowl-secret"
          type="text"
          placeholder="Seafowl Secret (Write Secret)"
          disabled={loading}
          defaultValue={config?.seafowlSecret}
          onChange={(ev) => setSeafowlSecretInput(ev.currentTarget.value)}
          style={{ width: "40ch" }}
        />
      </div>
      <button
        className="config-submit-button"
        disabled={!dirtyForm}
        onClick={onClickSave}
      >
        Save
      </button>
      {config && (
        <button className="config-delete-button" onClick={onClickClear}>
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
