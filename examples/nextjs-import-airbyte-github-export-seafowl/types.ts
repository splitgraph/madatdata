export interface ImportedRepository {
  githubNamespace: string;
  githubRepository: string;
  splitgraphNamespace: string;
  splitgraphRepository: string;
}

export interface TargetSplitgraphRepo {
  splitgraphNamespace?: string;
  splitgraphRepository: string;
}
