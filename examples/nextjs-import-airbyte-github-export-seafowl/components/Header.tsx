import React from "react";
import Link from "next/link";
import styles from "./Header.module.css";
import { LogoSVG } from "./Logo";

interface HeaderProps {}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/" className={styles.logo_link}>
          <LogoSVG size={36} />
          <div className={styles.wordmark}>GitHub Analytics</div>
        </Link>
      </div>
      <nav className={styles.nav}>
        <Link href="/link1">Link 1</Link>
        <Link href="/link2">Link 2</Link>
        <Link href="/link3">Link 3</Link>
        {/* Add more links as needed */}
      </nav>
    </header>
  );
};
