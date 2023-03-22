import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import styles from "./BaseLayout.module.css";

export const BaseLayout = ({
  children,
  breadcrumbs,
  heading,
}: PropsWithChildren<{
  breadcrumbs: ComponentProps<typeof Breadcrumbs>;
  heading: ReactNode;
}>) => {
  return (
    <div className={styles.layout}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>Logo</div>
        <div className={styles.links}>
          <a href="#">Link 1</a>
          <a href="#">Link 2</a>
        </div>
      </nav>
      <Breadcrumbs {...breadcrumbs} />
      <h2>{heading}</h2>
      <div className={styles.content}>{children}</div>
      <footer className={styles.footer}>Footer</footer>
    </div>
  );
};
