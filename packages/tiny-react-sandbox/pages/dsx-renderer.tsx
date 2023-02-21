import type React from "react";
import { render } from "../dsx/renderer";

// NOTE: This file can be executed in the browser at /dsx-renderer.html
//       OR via the command line with node www/dist/dsx-renderer.js

const DataContext = ({ children }: React.PropsWithChildren<{}>) => {
  return <div className="data-context">{children}</div>;
};

const MountedTable = ({
  children,
  sourcePlugin,
  sourceOpts,
  destOpts,
}: React.PropsWithChildren<{
  sourcePlugin: string;
  sourceOpts: {
    fileURL: string;
  };
  destOpts: {
    tableName: string;
  };
}>) => {
  return (
    <div
      className="mounted-table"
      data-sourcePlugin={sourcePlugin}
      data-destOpts-tableName={destOpts.tableName}
      data-sourceOpts-fileURL={sourceOpts.fileURL}
    >
      {children}
    </div>
  );
};

const SnapshottedTable = ({
  children,
  sourcePlugin,
  sourceOpts,
  destOpts,
}: React.PropsWithChildren<{
  sourcePlugin: string;
  sourceOpts: {
    fileURL: string;
  };
  destOpts: {
    tableName: string;
  };
}>) => {
  return (
    <div
      className="snapshotted-table"
      data-sourcePlugin={sourcePlugin}
      data-destOpts-tableName={destOpts.tableName}
      data-sourceOpts-fileURL={sourceOpts.fileURL}
    >
      {children}
    </div>
  );
};

const QueryTable = ({ children }: React.PropsWithChildren<{}>) => {
  return <div className="query-table">{children}</div>;
};

const DsxThingRoot = () => {
  return (
    <div id="dsx-root">
      <DataContext>
        <MountedTable
          sourcePlugin="csv"
          sourceOpts={{ fileURL: "https://link-to-live-csv.s3.test" }}
          destOpts={{ tableName: "microtransactions" }}
        />
        <SnapshottedTable
          sourcePlugin="parquet"
          sourceOpts={{ fileURL: "https://link-to-parquet.test" }}
          destOpts={{ tableName: "marketing_emails" }}
        />
        <QueryTable>
          SELECT cookie_id, avg(count(microtransactions)) FROM microtransactions
          LEFT JOIN marketing_emails ON cookie_id GROUP BY cookie_id;
        </QueryTable>
      </DataContext>
    </div>
  );
};

render(<DsxThingRoot />, {});
