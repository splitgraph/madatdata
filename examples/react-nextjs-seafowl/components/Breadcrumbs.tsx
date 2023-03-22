import Link from "next/link";
import styles from "./Breadcrumbs.module.css";

interface BreadcrumbsProps {
  crumbs: { href: string; anchor: string }[];
}

export const Breadcrumbs = ({ crumbs }: BreadcrumbsProps) => {
  return (
    <ul
      style={{
        display: "inline",
        listStyleType: "none",
        padding: 0,
      }}
    >
      <style type="text/css">
        {`

`}
      </style>
      {crumbs.map(({ href, anchor }, crumbIdx) => (
        <li
          className={styles.crumb}
          key={href}
          style={{
            display: "inline-block",
          }}
        >
          {crumbIdx === crumbs.length - 1 ? (
            <span>{anchor}</span>
          ) : (
            <Link href={href}>{anchor}</Link>
          )}
        </li>
      ))}
    </ul>
  );
};
