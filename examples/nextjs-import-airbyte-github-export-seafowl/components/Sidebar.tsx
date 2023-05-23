import React from "react";
import Link from "next/link";
import styles from "./Sidebar.module.css";

export interface GitHubRepository {
  namespace: string;
  repository: string;
}

interface SidebarProps {
  repositories: GitHubRepository[];
}

export const Sidebar = ({ repositories }: React.PropsWithRef<SidebarProps>) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.importButtonContainer}>
        <Link href="/start-import" className={styles.importButton}>
          Import Your Repository
        </Link>
      </div>
      <ul className={styles.repoList}>
        {repositories.map((repo, index) => (
          <li key={index}>
            <Link href={`/${repo.namespace}/${repo.repository}`}>
              {repo.namespace}/{repo.repository}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
};
