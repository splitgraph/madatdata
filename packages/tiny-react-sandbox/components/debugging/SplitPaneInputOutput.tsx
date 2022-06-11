import * as React from "react";

export const SplitPaneInputOutput = () => {
  const { inputRef, outputRef } = useInputOutput({
    makeOutput: (inputValue) => {
      return inputValue;
    },
    renderOutputToString: (output) => {
      return (
        typeof output === "object" && output?.toString
          ? output.toString()
          : output
      ) as string;
    },
    fetchOutput: async (inputValue) => {
      return new Promise((resolve, _reject) => {
        setTimeout(
          () => resolve(new Date().toString() + "\n" + inputValue),
          2000
        );
      });
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
  const { ref: outputRef, onChangeInput, onSubmitInput } = useOutputPane(opts);
  const { ref: inputRef } = useInputPane({ onChangeInput, onSubmitInput });

  return {
    outputRef,
    inputRef,
  };
};

const useOutputPane = <UnknownOutput extends unknown>({
  makeOutput,
  fetchOutput,
  renderOutputToString,
}: {
  makeOutput?: (inputValue?: string) => UnknownOutput;
  fetchOutput?: (inputValue?: string) => Promise<UnknownOutput>;
  renderOutputToString: (res: UnknownOutput) => string;
}) => {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  const onChangeInput = React.useCallback(
    (inputValue: string | undefined) => {
      if (!ref.current) {
        return;
      }

      const nextValue = renderOutputToString(
        makeOutput ? makeOutput(inputValue) : (inputValue as UnknownOutput)
      );
      ref.current.value = nextValue;
    },
    [ref]
  );

  const onSubmitInput = React.useCallback(
    (inputValue: string | undefined) => {
      if (!ref.current) {
        return;
      }

      if (!inputValue) {
        return;
      }

      fetchOutput?.(inputValue).then(function (nextResult) {
        if (ref.current) {
          ref.current.value = renderOutputToString(nextResult);
        } else {
          console.warn("Lost ref.current");
        }
      });
    },
    [ref]
  );

  return {
    ref,
    onChangeInput,
    onSubmitInput,
  };
};

const wasCmdEnter = (ev: KeyboardEvent) => ev.metaKey && ev.key === "Enter";

const useInputPane = ({
  onChangeInput,
  onSubmitInput,
}: {
  onChangeInput: (currentValue: string | undefined) => void;
  onSubmitInput?: (currentValue: string | undefined) => void;
}) => {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  const [curValue, setValue] = React.useState(ref.current?.value);

  const onChange = React.useCallback(
    function (this: HTMLTextAreaElement, ev: KeyboardEvent) {
      if (onSubmitInput && wasCmdEnter(ev)) {
        console.log("cmd+enter: Skip onChange in favor of onSubmitInput");
        onChangeInput(this.value);
      }
    },
    [setValue]
  );

  const onMaybeSubmit = React.useCallback(
    function (this: HTMLTextAreaElement, ev: KeyboardEvent) {
      if (wasCmdEnter(ev)) {
        console.log("Was submitted");
        onSubmitInput?.(this.value);
      }
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

    // Listen fr cmd + enter
    ref.current.addEventListener("keydown", onMaybeSubmit);

    return () => {
      ref.current?.removeEventListener("keydown", onChange);
      ref.current?.removeEventListener("keyup", onChange);
      ref.current?.removeEventListener("keydown", onMaybeSubmit);
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
