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
      <Breadcrumbs {...breadcrumbs} />
      <h2>{heading}</h2>
      {children}
    </div>
  );
};
