import React from "react";
import { LegalDocumentView } from "./legal/LegalDocumentView";
import { TERMS_OF_SERVICE } from "../constants/legalDocuments";

// The text lives in constants/legalDocuments.ts, shared with the Customer App.
export const TermsOfServicePage: React.FC = () => (
  <LegalDocumentView
    document={TERMS_OF_SERVICE}
    meta={[
      { label: "Jurisdiction", value: "Tacurong City, Philippines" },
      { label: "Applies to", value: "Customers, riders and dispatchers" },
    ]}
  />
);

export default TermsOfServicePage;
