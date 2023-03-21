# Seafowl + Next.js Example

This is an example of creating a Next.js site that queries
[Seafowl](https://seafowl.io) to generate the content for its pages.

The example references Google Search data for seafowl.io, which was obtained
from the Google Search Console, imported into Splitgraph using the Singer tap
for Google Search, and then exported to Seafowl by calling a GraphQL mutation at
the Splitgraph API. (Note: this is all possible with Madatdata code, but it was
done manually in this case.)

## Page Structure

The reason for using Search data in this example is because it lends itself well
to per-page group-bys, for example a page for each keyword and a page for each
URL, all of which are not known ahead of time, and can use Next.js Incremental
Static Regeneration (ISR) to generate their pages.

Note it's slightly confusing because there is `pages/pages`, where the second
`/pages` refers to "pages" as in seafowl.io pages that are indexed by Google
Search.

Pages:

- `/metrics/index`

Queries:

- Highest clicks by page

```

/metrics/index
  Display list of available domains, link each to ./[domain]

/metrics/[domain]
  Display link to ./queries and ./pages

/metrics/[domain]/queries
  Display list of queries, and link each to ./by-query

/metrics/[domain]/by-query/[search_query]
  Display monthly reports for given domain and search query

/metrics/[domain]/by-page/[site_page]
  Display weekly reports for given domain and page
```
