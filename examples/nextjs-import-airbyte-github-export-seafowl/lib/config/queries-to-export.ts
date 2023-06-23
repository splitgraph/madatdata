/**
 * Return a a list of queries to export from Splitgraph to Seafowl, given the
 * source repository (where the GitHub data was imported into), and the destination
 * schema (where the data will be exported to at Seafowl).
 */
export const makeQueriesToExport = ({
  splitgraphSourceRepository,
  splitgraphSourceNamespace,
  seafowlDestinationSchema,
  splitgraphSourceImageHashOrTag = "latest",
}: {
  splitgraphSourceNamespace: string;
  splitgraphSourceRepository: string;
  seafowlDestinationSchema: string;
  splitgraphSourceImageHashOrTag?: string;
}): {
  sourceQuery: string;
  destinationSchema: string;
  destinationTable: string;
  /**
   * Optionally provide a DDL query to create the (empty) destination table in
   * case the export from Splitgraph fails. This is a workaround of a bug where
   * exports from Splitgraph to Seafowl fail if the destination table does not
   * contain any rows. See: https://github.com/splitgraph/seafowl/issues/423
   *
   * This way, even if a table fails to load, we can at least reference it in subsequent
   * analytics queries without challenges like conditionally checking if it exists.
   */
  fallbackCreateTableQuery?: string;
}[] => [
  {
    destinationSchema: seafowlDestinationSchema,
    destinationTable: "simple_stargazers_query",
    sourceQuery: `
SELECT * FROM "${splitgraphSourceNamespace}/${splitgraphSourceRepository}:${splitgraphSourceImageHashOrTag}".stargazers`,
  },

  {
    destinationSchema: seafowlDestinationSchema,
    destinationTable: "monthly_user_stats",
    sourceQuery: `
WITH

commits AS (
    SELECT
        date_trunc('month', created_at) AS created_at_month,
        author->>'login' AS username,
        count(*) as no_commits
    FROM "${splitgraphSourceNamespace}/${splitgraphSourceRepository}:${splitgraphSourceImageHashOrTag}".commits
    GROUP BY 1, 2
),

comments AS (
    SELECT
        date_trunc('month', created_at) AS created_at_month,
        "user"->>'login' AS username,
        count(*) filter (where exists(select regexp_matches(issue_url, '.*/pull/.*'))) as no_pull_request_comments,
        count(*) filter (where exists(select regexp_matches(issue_url, '.*/issue/.*'))) as no_issue_comments,
        sum(length(body)) as total_comment_length
    FROM "${splitgraphSourceNamespace}/${splitgraphSourceRepository}:${splitgraphSourceImageHashOrTag}".comments
    GROUP BY 1, 2
),

pull_requests AS (
    WITH pull_request_creator AS (
        SELECT id, "user"->>'login' AS username
        FROM "${splitgraphSourceNamespace}/${splitgraphSourceRepository}:${splitgraphSourceImageHashOrTag}".pull_requests
    )

    SELECT
        date_trunc('month', updated_at) AS created_at_month,
        username,
        count(*) filter (where merged = true) AS merged_pull_requests,
        count(*) AS total_pull_requests,
        sum(additions::integer) filter (where merged = true) AS lines_added,
        sum(deletions::integer) filter (where merged = true) AS lines_deleted
    FROM "${splitgraphSourceNamespace}/${splitgraphSourceRepository}:${splitgraphSourceImageHashOrTag}".pull_request_stats
    INNER JOIN pull_request_creator USING (id)
    GROUP BY 1, 2
),

all_months_users AS (
    SELECT DISTINCT created_at_month, username FROM commits
    UNION SELECT DISTINCT created_at_month, username FROM comments
    UNION SELECT DISTINCT created_at_month, username FROM pull_requests
),

user_stats AS (
    SELECT
        amu.created_at_month,
        amu.username,
        COALESCE(cmt.no_commits, 0) AS no_commits,
        COALESCE(cmnt.no_pull_request_comments, 0) AS no_pull_request_comments,
        COALESCE(cmnt.no_issue_comments, 0) AS no_issue_comments,
        COALESCE(cmnt.total_comment_length, 0) AS total_comment_length,
        COALESCE(pr.merged_pull_requests, 0) AS merged_pull_requests,
        COALESCE(pr.total_pull_requests, 0) AS total_pull_requests,
        COALESCE(pr.lines_added, 0) AS lines_added,
        COALESCE(pr.lines_deleted, 0) AS lines_deleted

    FROM all_months_users amu
        LEFT JOIN commits cmt ON amu.created_at_month = cmt.created_at_month AND amu.username = cmt.username
        LEFT JOIN comments cmnt ON amu.created_at_month = cmnt.created_at_month AND amu.username = cmnt.username
        LEFT JOIN pull_requests pr ON amu.created_at_month = pr.created_at_month AND amu.username = pr.username

    ORDER BY created_at_month ASC, username ASC
)

SELECT * FROM user_stats;
`,
    fallbackCreateTableQuery: `
CREATE TABLE "${seafowlDestinationSchema}".monthly_user_stats (
    created_at_month TIMESTAMP,
    username VARCHAR,
    no_commits BIGINT,
    no_pull_request_comments BIGINT,
    no_issue_comments BIGINT,
    total_comment_length BIGINT,
    merged_pull_requests BIGINT,
    total_pull_requests BIGINT,
    lines_added BIGINT,
    lines_deleted BIGINT
);
  `,
  },
  {
    destinationSchema: seafowlDestinationSchema,
    destinationTable: "monthly_issue_stats",
    sourceQuery: `
SELECT
    issue_number,
    date_trunc('month', created_at::TIMESTAMP) as created_at_month,
    COUNT(*) AS total_reacts,
    COUNT(*) FILTER (WHERE content = '+1') AS no_plus_one,
    COUNT(*) FILTER (WHERE content = '-1') AS no_minus_one,
    COUNT(*) FILTER (WHERE content = 'laugh') AS no_laugh,
    COUNT(*) FILTER (WHERE content = 'confused') AS no_confused,
    COUNT(*) FILTER (WHERE content = 'heart') AS no_heart,
    COUNT(*) FILTER (WHERE content = 'hooray') AS no_hooray,
    COUNT(*) FILTER (WHERE content = 'rocket') AS no_rocket,
    COUNT(*) FILTER (WHERE content = 'eyes') AS no_eyes
FROM
    "${splitgraphSourceNamespace}/${splitgraphSourceRepository}:${splitgraphSourceImageHashOrTag}"."issue_reactions"
GROUP BY 1, 2 ORDER BY 2, 3 DESC;
`,
    fallbackCreateTableQuery: `
CREATE TABLE "${seafowlDestinationSchema}".monthly_issue_stats (
  issue_number BIGINT,
  created_at_month TIMESTAMP,
  total_reacts BIGINT,
  no_plus_one BIGINT,
  no_minus_one BIGINT,
  no_laugh BIGINT,
  no_confused BIGINT,
  no_heart BIGINT,
  no_hooray BIGINT,
  no_rocket BIGINT,
  no_eyes BIGINT
);
`,
  },
];

/** A generic demo query that can be used to show off Splitgraph */
export const genericDemoQuery = `WITH t (
    c_int16_smallint,
    c_int32_int,
    c_int64_bigint,
    c_utf8_char,
    c_utf8_varchar,
    c_utf8_text,
    c_float32_float,
    c_float32_real,
    c_boolean_boolean,
    c_date32_date,
    c_timestamp_microseconds_timestamp

  ) AS (
    VALUES(
      /* Int16 / SMALLINT */
      42::SMALLINT,
      /* Int32 / INT */
      99::INT,
      /* Int64 / BIGINT */
      420420::BIGINT,
      /* Utf8 / CHAR */
      'x'::CHAR,
      /* Utf8 / VARCHAR */
      'abcdefghijklmnopqrstuvwxyz'::VARCHAR,
      /* Utf8 / TEXT */
      'zyxwvutsrqponmlkjihgfedcba'::TEXT,
      /* Float32 / FLOAT */
      4.4::FLOAT,
      /* Float32 / REAL */
      2.0::REAL,
      /* Boolean / BOOLEAN */
      't'::BOOLEAN,
      /* Date32 / DATE */
      '1997-06-17'::DATE,
      /* Timestamp(us) / TIMESTAMP */
      '2018-11-11T11:11:11.111111111'::TIMESTAMP
    )
  ) SELECT * FROM t;`;
