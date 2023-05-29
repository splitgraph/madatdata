import { BaseLayout } from "../components/BaseLayout";

import { Sidebar } from "../components/Sidebar";
import { Stepper } from "../components/ImportExportStepper/Stepper";

const ImportPage = () => {
  return (
    <BaseLayout sidebar={<Sidebar />}>
      <Stepper />
    </BaseLayout>
  );
};

export default ImportPage;
