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
URL.

These could use Incremental Static Regeneration, since many of them are known
ahead of time, but at the moment this demo just showcases using hooks, except
for on the root page that lists available domains and metrics.
