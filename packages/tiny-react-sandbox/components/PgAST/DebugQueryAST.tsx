import * as React from "react";

export const DebugQueryAST = () => {
  const { ref: resultRef, onChangeInput } = useQueryResult({
    makeResult: (queryInput) => {
      return queryInput;
    },
    renderToString: (queryResult) => {
      return (queryResult as string) ?? "Failed to render as string";
    },
  });
  const { ref: inputRef } = useQueryInput({ onChangeInput });

  return (
    <PageContainer>
      <LeftContainer>
        <QueryInput ref={inputRef} />
      </LeftContainer>
      <RightContainer>
        <QueryResult ref={resultRef} />
      </RightContainer>
    </PageContainer>
  );
};

const useQueryResult = <UnknownResult extends unknown>({
  makeResult,
  renderToString,
}: {
  makeResult: (inputValue?: string) => UnknownResult;
  renderToString: (res: UnknownResult) => string;
}) => {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  const onChangeInput = React.useCallback(
    (inputValue: string | undefined) => {
      if (!ref.current) {
        return;
      }

      const nextValue = renderToString(makeResult(inputValue));
      ref.current.value = nextValue;
    },
    [ref]
  );

  return {
    ref,
    onChangeInput,
  };
};

const useQueryInput = ({
  onChangeInput,
}: {
  onChangeInput: (queryInputString: string | undefined) => void;
}) => {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  const [curValue, setValue] = React.useState(ref.current?.value);

  const onChange = React.useCallback(
    function (this: HTMLTextAreaElement) {
      onChangeInput(this.value);
    },
    [setValue]
  );

  React.useEffect(() => {
    if (!ref.current) {
      return;
    }

    // Listen for events on both keydown and keyup to create illusion
    // so that ref.current is not the "previous" value like with keypress
    ref.current.addEventListener("keydown", onChange);
    ref.current.addEventListener("keyup", onChange);

    return () => {
      ref.current?.removeEventListener("keydown", onChange);
      ref.current?.removeEventListener("keyup", onChange);
    };
  }, [onChange, ref.current]);

  return {
    curValue,
    ref,
  };
};

const QueryInput = React.forwardRef<HTMLTextAreaElement | null>(
  (props: { defaultValue?: string }, ref) => {
    const { defaultValue = "" } = props;
    return (
      <textarea
        ref={ref}
        style={{
          minWidth: "100%",
          minHeight: "80vh",
        }}
        defaultValue={defaultValue}
      />
    );
  }
);

const QueryResult = React.forwardRef<
  HTMLTextAreaElement | null,
  React.HTMLProps<HTMLTextAreaElement>
>((props, ref) => {
  return (
    <textarea
      ref={ref}
      style={{
        minWidth: "100%",
        minHeight: "80vh",
      }}
      defaultValue={"Start typing on the left..."}
      readOnly
      {...props}
    />
  );
});

const PageContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
      }}
    >
      {children}
    </div>
  );
};

const LeftContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      style={{
        minWidth: "50%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "yellow",
      }}
    >
      {children}
    </div>
  );
};

const RightContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      style={{
        minWidth: "50%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "cyan",
      }}
    >
      {children}
    </div>
  );
};
