// Manually-defined types, e.g. adding fields to some JSON value

/**
 * A typed version of the JSON field in ExportJobStatus.output
 */
export interface ExportJobOutput {
  /**
   * The URL of the file where the output artifact can be downloaded
   */
  url: string;
}
