import * as React from "react";

export const SplitPaneInputOutput = () => {
  const { inputRef, outputRef } = useInputOutput({
    makeOutput: (inputValue) => {
      return inputValue;
    },
    renderOutputToString: (output) => {
      return output as string;
    },
  });

  return (
    <PageContainer>
      <InputContainer>
        <InputPane ref={inputRef} />
      </InputContainer>
      <OutputContainer>
        <OutputPane ref={outputRef} />
      </OutputContainer>
    </PageContainer>
  );
};

const useInputOutput = (opts: Parameters<typeof useOutputPane>["0"]) => {
  const { ref: outputRef, onChangeInput } = useOutputPane(opts);
  const { ref: inputRef } = useInputPane({ onChangeInput });

  return {
    outputRef,
    inputRef,
  };
};

const useOutputPane = <UnknownOutput extends unknown>({
  makeOutput,
  renderOutputToString,
}: {
  makeOutput: (inputValue?: string) => UnknownOutput;
  renderOutputToString: (res: UnknownOutput) => string;
}) => {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  const onChangeInput = React.useCallback(
    (inputValue: string | undefined) => {
      if (!ref.current) {
        return;
      }

      const nextValue = renderOutputToString(makeOutput(inputValue));
      ref.current.value = nextValue;
    },
    [ref]
  );

  return {
    ref,
    onChangeInput,
  };
};

const useInputPane = ({
  onChangeInput,
}: {
  onChangeInput: (currentValue: string | undefined) => void;
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

const InputPane = React.forwardRef<HTMLTextAreaElement | null>(
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

const OutputPane = React.forwardRef<
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

const InputContainer = ({ children }: { children: React.ReactNode }) => {
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

const OutputContainer = ({ children }: { children: React.ReactNode }) => {
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
