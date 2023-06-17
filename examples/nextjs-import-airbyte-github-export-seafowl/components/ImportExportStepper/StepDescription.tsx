import styles from "./StepDescription.module.css";

export const StepDescription = ({
  children,
  status,
}: React.PropsWithChildren<{
  status: "active" | "completed" | "unstarted" | "loading";
}>) => {
  return (
    <div
      className={[
        styles.stepDescriptionContainer,
        styles[`step-description-status-${status}`],
      ].join(" ")}
    >
      {typeof children === "string" ? <p>{children}</p> : children}
    </div>
  );
};
