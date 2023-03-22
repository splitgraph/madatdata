import { Breadcrumbs } from "../components/Breadcrumbs";
import Link from "next/link";

const SeafowlSampleQuery = () => {
  return (
    <div>
      <Breadcrumbs crumbs={[{ href: "/", anchor: "Home" }]} />
      <h2>Seafowl Demo</h2>
      <ul>
        <li>
          <Link href="/metrics">Metrics by Domain</Link>
        </li>
      </ul>
    </div>
  );
};

export default SeafowlSampleQuery;
