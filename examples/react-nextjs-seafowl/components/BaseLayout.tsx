import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import styles from "./BaseLayout.module.css";
import { LogoSVG } from "./Logo";
import Link from "next/link";

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
        <Link href="/" className={styles.logolink}>
          <div className={styles.logo}>
            <LogoSVG size={40} />
            <h2 className={styles.wordmark}>Seafowl Demo</h2>
          </div>
        </Link>
        <div className={styles.links}>
          <Link href="/metrics">Metrics</Link>
          <Link href="/metrics/seafowl.io/queries">Queries</Link>
          <Link href="/metrics/seafowl.io/pages">Pages</Link>
        </div>
      </nav>
      <Breadcrumbs {...breadcrumbs} />
      <h2 className={styles.heading}>{heading}</h2>
      <div className={styles.content}>{children}</div>
      <footer className={styles.footer}>
        <span>
          Data Served by <Link href="https://seafowl.io">Seafowl</Link> and{" "}
          Queried with{" "}
          <Link href="https://github.com/splitgraph/madatdata">Madatdata</Link>
        </span>
      </footer>
    </div>
  );
};
