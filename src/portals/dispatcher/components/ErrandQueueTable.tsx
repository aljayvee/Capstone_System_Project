import React from "react";
import { Errand, ErrandStatus } from "../../../types/errand";
import { DispatchManagementWorkspace } from "./workspace/DispatchManagementWorkspace";

export interface ErrandQueueTableProps {
  errands: Errand[];
  currentUser: any;
  onClaimOrder: (orderId: string, user: any) => Promise<void> | void;
  onOpenChat: (orderId: string) => void;
  onUpdateStatus: (errandId: string, newStatus: ErrandStatus) => Promise<void> | void;
  onDeclineOrder?: (orderId: string, reason?: string) => Promise<void> | void;
}

/**
 * ErrandQueueTable now delegates to the Apple HIG Layout A
 * Master-Detail Dispatch Management Workspace.
 * All props, action handlers, and API connections remain 100% unchanged.
 */
export const ErrandQueueTable: React.FC<ErrandQueueTableProps> = (props) => {
  return <DispatchManagementWorkspace {...props} />;
};
