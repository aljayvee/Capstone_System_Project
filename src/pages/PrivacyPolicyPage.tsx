import React from "react";
import { LegalDocumentView } from "./legal/LegalDocumentView";
import { PRIVACY_POLICY } from "../constants/legalDocuments";

// The text lives in constants/legalDocuments.ts, shared with the Customer App.
export const PrivacyPolicyPage: React.FC = () => (
  <LegalDocumentView
    document={PRIVACY_POLICY}
    meta={[
      { label: "Jurisdiction", value: "Tacurong City, Philippines" },
      { label: "Law", value: "RA 10173 (Data Privacy Act of 2012)" },
    ]}
  />
);

export default PrivacyPolicyPage;
