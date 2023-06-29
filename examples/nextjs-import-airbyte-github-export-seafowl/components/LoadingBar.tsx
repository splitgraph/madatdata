import styles from "./LoadingBar.module.css";
import { useState, useEffect, ComponentProps } from "react";

export const LoadingBar = ({
  children,
  title,
  formatTimeElapsed,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
  formatTimeElapsed?: FormatTimeElapsed;
}) => {
  return children || title ? (
    <LoadingBarWithText formatTimeElapsed={formatTimeElapsed} title={title}>
      {children}
    </LoadingBarWithText>
  ) : (
    <JustLoadingBar formatTimeElapsed={formatTimeElapsed} inBox={false} />
  );
};

export const JustLoadingBar = ({
  inBox,
  formatTimeElapsed,
}: {
  inBox: boolean;
  formatTimeElapsed?: FormatTimeElapsed;
}) => {
  return (
    <div
      className={[
        styles.loaderContainer,
        inBox ? styles.loaderInBox : styles.loaderIsolated,
      ].join(" ")}
    >
      <div className={styles.loader}>
        <div className={styles.loaderBar}></div>
      </div>
      <TimeElapsed formatTimeElapsed={formatTimeElapsed} />
    </div>
  );
};

export const LoadingBarWithText = ({
  children,
  title,
  formatTimeElapsed,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
  formatTimeElapsed?: FormatTimeElapsed;
}) => {
  return (
    <div className={styles.loadingBox}>
      {title ? <h2 className={styles.loadingTitle}>{title}</h2> : null}
      <JustLoadingBar inBox={true} formatTimeElapsed={formatTimeElapsed} />
      {children}
    </div>
  );
};

type FormatTimeElapsed = (seconds: number) => React.ReactNode;

const defaultFormatTimeElapsed: FormatTimeElapsed = (seconds) =>
  `Time elapsed: ${seconds} seconds...`;

const TimeElapsed = ({
  formatTimeElapsed = defaultFormatTimeElapsed,
}: {
  formatTimeElapsed?: FormatTimeElapsed;
}) => {
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSeconds((prevSeconds) => prevSeconds + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={styles.timeElapsed}>
      {seconds < 2 ? <>&nbsp;</> : <>{formatTimeElapsed(seconds)}</>}
    </div>
  );
};
