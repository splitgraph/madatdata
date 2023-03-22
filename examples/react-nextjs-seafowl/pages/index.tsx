import { BaseLayout } from "../components/BaseLayout";
import Link from "next/link";

const SeafowlSampleQuery = () => {
  return (
    <BaseLayout
      heading="Seafowl Demo"
      breadcrumbs={{ crumbs: [{ href: "/", anchor: "Home" }] }}
    >
      <ul>
        <li>
          <Link href="/metrics">Metrics by Domain</Link>
        </li>
      </ul>
    </BaseLayout>
  );
};

export default SeafowlSampleQuery;
