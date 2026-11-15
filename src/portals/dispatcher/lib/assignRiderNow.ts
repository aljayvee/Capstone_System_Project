import { apiClient } from "../../../services/apiClient";

/**
 * Asks the server to pick and offer a rider (POST /errands/:id/assign-rider with
 * no rider named). Shared by "Assign a rider" in the order chat and Re-assign in
 * RiderDeclinedDialog, so both read the result and the refusal the same way.
 * The server keeps riders who declined this errand off the list itself.
 */
export async function assignRiderNow(orderId: string): Promise<{ riderName: string }> {
  const res = await apiClient.post(`/errands/${orderId}/assign-rider`, {});
  const errandData = res.data?.errand || res.data;
  const assignedRider = errandData?.rider;
  const riderName =
    assignedRider?.name ||
    (assignedRider?.firstName
      ? `${assignedRider.firstName} ${assignedRider.lastName || ""}`.trim()
      : errandData?.riderName || "Your rider");
  return { riderName };
}

/**
 * The server's own sentence for a refused assignment, else the fallback.
 *
 * The key is `error`, not `message`: errorHandler.ts serialises every
 * ServiceError as `{ error: err.message }`. Reading `.message` matched nothing
 * on every failure, so the one genuinely useful sentence the server sends (the
 * per-rider breakdown, or "2 riders have already declined this errand") was
 * replaced by the generic fallback. Never err.message itself: a raw HTTP status
 * string means nothing to a dispatcher.
 */
export function assignRiderErrorText(err: any, fallback: string): string {
  return err?.response?.data?.error || err?.response?.data?.message || fallback;
}
