import { useState, useCallback } from "react";
import { toast } from "sonner";
import { assignRiderErrorText, assignRiderNow } from "../../../lib/assignRiderNow";
import { formatErrandId } from "../../../../../utils/formatErrandId";
import { copy } from "../copy";
import { useOptionalPermissions } from "../../../../../context/PermissionsContext";

interface UseRiderDispatchArgs {
  orderId: string;
  pushMessage: (payload: Record<string, any>) => void;
  onRefreshOrders?: () => void;
  onDispatched: () => void;
}

export function useRiderDispatch({
  orderId,
  pushMessage,
  onRefreshOrders,
  onDispatched,
}: UseRiderDispatchArgs) {
  const [isAssigning, setIsAssigning] = useState(false);
  // The server refuses it too; this says why before the round trip.
  const permissions = useOptionalPermissions();
  const canAssign = !permissions || permissions.can("errands.assign");

  const sendRider = useCallback(async () => {
    if (!canAssign) {
      toast.error("Your access group does not include assigning riders. The Main Owner can change it.");
      return;
    }
    setIsAssigning(true);
    try {
      const { riderName } = await assignRiderNow(orderId);

      toast.success(copy.stage5.assigned(riderName, formatErrandId(orderId)));

      pushMessage({
        type: "rider_assigned",
        text: `Your rider, ${riderName}, has been assigned and is on the way.`,
      });

      onRefreshOrders?.();
      onDispatched();
    } catch (err: any) {
      console.error("Failed to assign rider:", err);
      // The server's own sentence wins (per-rider breakdown, missing pinpoints,
      // riders who already declined); see assignRiderErrorText for why.
      toast.error(assignRiderErrorText(err, copy.stage5.failed));
    } finally {
      setIsAssigning(false);
    }
  }, [orderId, pushMessage, onRefreshOrders, onDispatched, canAssign]);

  return { isAssigning, sendRider };
}
