import type { ButtonHTMLAttributes, CSSProperties } from "react";

import TabButtonStyle from "./TabButton.module.css";

interface TabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  onClick: () => void;
  size?: CSSProperties["fontSize"];
}

export const TabButton = ({
  active,
  onClick,
  disabled: alwaysDisabled,
  children,
  size,
  ...rest
}: React.PropsWithChildren<TabButtonProps>) => {
  const className = [
    TabButtonStyle["tab-button"],
    ...(active
      ? [TabButtonStyle["tab-button-active"]]
      : [TabButtonStyle["tab-button-inactive"]]),
    ...(alwaysDisabled ? [TabButtonStyle["tab-button-disabled"]] : []),
  ].join(" ");

  return (
    <button
      onClick={onClick}
      disabled={active || alwaysDisabled}
      className={className}
      {...rest}
    >
      {typeof size !== "undefined" ? (
        <span style={{ fontSize: size }}>{children}</span>
      ) : (
        children
      )}
    </button>
  );
};
