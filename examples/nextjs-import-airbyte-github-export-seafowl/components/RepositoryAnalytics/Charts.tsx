import style from "./Charts.module.css";

import type { ImportedRepository } from "../../types";

export interface ChartsProps {
  importedRepository: ImportedRepository;
}

export const Charts = ({
  importedRepository: {
    githubNamespace,
    githubRepository,
    splitgraphNamespace,
    splitgraphRepository,
  },
}: ChartsProps) => {
  return (
    <div className={style.charts}>
      Chart for{" "}
      <a href={`https://github.com/${githubNamespace}/${githubRepository}`}>
        github.com/{githubNamespace}/{githubRepository}
      </a>
      , based on{" "}
      <a
        href={`https://www.splitgraph.com/${splitgraphNamespace}/${splitgraphRepository}`}
      >
        splitgraph.com/{splitgraphNamespace}/{splitgraphRepository}
      </a>
    </div>
  );
};
