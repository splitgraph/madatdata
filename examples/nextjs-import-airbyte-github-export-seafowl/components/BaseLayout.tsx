import styles from "./BaseLayout.module.css";
import { Header } from "./Header";

export const BaseLayout = ({
  children,
  sidebar,
}: React.PropsWithChildren<{
  sidebar: React.ReactNode;
}>) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Header />
      </div>
      <div className={styles.main}>
        <div className={styles.sidebar}>{sidebar}</div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
};
