import type { ButtonHTMLAttributes } from "react";

import TabButtonStyle from "./TabButton.module.css";

interface TabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  onClick: () => void;
}

export const TabButton = ({
  active,
  onClick,
  disabled: alwaysDisabled,
  children,
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
      {children}
    </button>
  );
};
