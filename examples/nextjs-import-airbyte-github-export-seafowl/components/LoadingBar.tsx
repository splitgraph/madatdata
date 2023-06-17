import styles from "./LoadingBar.module.css";
import { useState, useEffect } from "react";

export const LoadingBar = ({
  children,
  title,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
}) => {
  return children || title ? (
    <LoadingBarWithText title={title}>{children}</LoadingBarWithText>
  ) : (
    <JustLoadingBar inBox={false} />
  );
};

export const JustLoadingBar = ({ inBox }: { inBox: boolean }) => {
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
      <TimeElapsed />
    </div>
  );
};

export const LoadingBarWithText = ({
  children,
  title,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
}) => {
  return (
    <div className={styles.loadingBox}>
      {title ? <h2 className={styles.loadingTitle}>{title}</h2> : null}
      <JustLoadingBar inBox={true} />
      {children}
    </div>
  );
};

const TimeElapsed = () => {
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
      {seconds < 2 ? <>&nbsp;</> : <>Time elapsed: {seconds} seconds...</>}
    </div>
  );
};
