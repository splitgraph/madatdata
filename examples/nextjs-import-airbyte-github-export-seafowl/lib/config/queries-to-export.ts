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
}[] => [
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
  },
];
