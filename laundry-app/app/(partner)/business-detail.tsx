import { useState } from "react";

import { PartnerBusinessDetailsForm } from "@/components/partner-business-details-form";
import { PartnerStoreManagement } from "@/components/partner-store-management";

export default function PartnerBusinessDetailScreen() {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <PartnerBusinessDetailsForm mode="profile" onExit={() => setEditing(false)} />;
  }

  return <PartnerStoreManagement onEditDetails={() => setEditing(true)} />;
}
