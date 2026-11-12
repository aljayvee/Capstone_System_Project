import { useState, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../../../services/apiClient";
import { formatErrandId } from "../../../../../utils/formatErrandId";
import { copy } from "../copy";

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

  const sendRider = useCallback(async () => {
    setIsAssigning(true);
    try {
      const res = await apiClient.post(`/errands/${orderId}/assign-rider`, {});
      const errandData = res.data?.errand || res.data;
      const assignedRider = errandData?.rider;
      const riderName =
        assignedRider?.name ||
        (assignedRider?.firstName
          ? `${assignedRider.firstName} ${assignedRider.lastName || ""}`.trim()
          : "Your rider");

      toast.success(copy.stage5.assigned(riderName, formatErrandId(orderId)));

      pushMessage({
        type: "rider_assigned",
        text: `Your rider, ${riderName}, has been assigned and is on the way.`,
      });

      onRefreshOrders?.();
      onDispatched();
    } catch (err: any) {
      console.error("Failed to assign rider:", err);
      // A raw HTTP status string ("Request failed with status code 404") means
      // nothing to a dispatcher — the server's own message wins when it has
      // one, otherwise a plain sentence, never err.message itself.
      //
      // The key is `error`, not `message`: errorHandler.ts serialises every
      // ServiceError as `{ error: err.message }`. Reading `.message` here
      // matched nothing on every failure, so the one genuinely useful sentence
      // the server sends — the per-rider breakdown ("Ana: needs notifications;
      // Leo: last seen 412s ago", or "Cannot auto-assign a rider before store
      // pinpoints ... are set") — was replaced by the generic fallback, and a
      // dispatcher looking at a roster of visibly-online riders was told only
      // to try again.
      toast.error(
        err.response?.data?.error || err.response?.data?.message || copy.stage5.failed
      );
    } finally {
      setIsAssigning(false);
    }
  }, [orderId, pushMessage, onRefreshOrders, onDispatched]);

  return { isAssigning, sendRider };
}
