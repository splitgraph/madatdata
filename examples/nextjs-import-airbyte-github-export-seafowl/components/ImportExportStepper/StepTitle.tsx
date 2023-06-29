import styles from "./StepTitle.module.css";

export const StepTitle = ({
  stepNumber,
  stepTitle,
  status,
}: {
  stepNumber: number;
  stepTitle: string;
  status: "active" | "completed" | "unstarted" | "loading";
}) => {
  return (
    <div
      className={[
        styles.stepTitleContainer,
        styles[`step-status-${status}`],
      ].join(" ")}
    >
      <h2 key="step-number" className={styles.stepNumber}>
        {stepNumber.toString()}
      </h2>
      <h2 key="step-title" className={styles.stepTitle}>
        {stepTitle}
      </h2>
    </div>
  );
};
