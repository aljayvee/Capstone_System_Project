import { errandRepository, dispatchLogRepository } from "../repositories/errandRepository.js";
import { pinpointRepository, type PinpointInput } from "../repositories/pinpointRepository.js";
import { rateConfigRepository } from "../repositories/rateConfigRepository.js";
import { customerTransactionRepository } from "../repositories/customerTransactionRepository.js";
import { userRepository } from "../repositories/userRepository.js";
import { ServiceError } from "./ServiceError.js";
import { eventPublisher } from "../lib/eventPublisher.js";
import { sendPushNotification } from "../lib/pushNotifications.js";
import { normalizeStatus, assertValidTransition, type ErrandStatusValue } from "./patterns/errandStateMachine.js";
import { defaultPricingStrategy } from "./patterns/pricingStrategy.js";

type NamedPerson = { firstName: string; lastName: string } | null | undefined;
type CustomerRelation =
  | { information: { firstName: string; lastName: string; phone: string } | null }
  | null
  | undefined;

function withPersonName<T extends NamedPerson>(person: T) {
  if (!person) return person;
  return { ...person, name: `${person.firstName} ${person.lastName}`.trim() };
}

// Flattens the CustomerAccount.information relation (split across two tables) back
// into a flat { firstName, lastName, phone, name } shape, so the HTTP response
// contract the web dashboard already consumes is unchanged.
function withCustomerName(customer: CustomerRelation) {
  if (!customer?.information) return null;
  const { firstName, lastName, phone } = customer.information;
  return { firstName, lastName, phone, name: `${firstName} ${lastName}`.trim() };
}

// Injects a computed `name` into an errand's customer/rider/dispatcher relations
export function attachErrandNames<
  T extends {
    customer?: CustomerRelation;
    rider?: NamedPerson;
    dispatchLogs?: Array<{ dispatcher?: NamedPerson } & Record<string, unknown>>;
  }
>(errand: T) {
  return {
    ...errand,
    customer: withCustomerName(errand.customer),
    rider: withPersonName(errand.rider),
    dispatchLogs: errand.dispatchLogs?.map((log) => ({
      ...log,
      dispatcher: withPersonName(log.dispatcher),
    })),
  };
}

export async function listErrands(requestingUser?: { id: number; role: string }) {
  const errands =
    requestingUser?.role === "DISPATCHER"
      ? await errandRepository.findManyForDispatcher(requestingUser.id)
      : await errandRepository.findMany();
  return errands.map(attachErrandNames);
}

export async function getErrandById(id: string) {
  const errand = await errandRepository.findById(id);
  return errand ? attachErrandNames(errand) : null;
}

export async function listErrandsForCustomer(customerId: number) {
  const errands = await errandRepository.findByCustomerId(customerId);
  return errands.map(attachErrandNames);
}

export async function listErrandsForRider(riderId: number) {
  const errands = await errandRepository.findByRiderId(riderId);
  return errands.map(attachErrandNames);
}

export interface CreateErrandInput {
  customerId?: string | number;
  category?: string;
  description?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  deliveryLatitude?: number | string;
  deliveryLongitude?: number | string;
  estimatedCost?: number | string;
  deliveryFee?: number | string;
  tip?: number | string;
  totalCost?: number | string;
  paymentMethod?: string;
  pabiliItems?: Array<{
    itemName?: string;
    name?: string;
    quantity?: number;
    unitPrice?: number;
    estimatedSubtotal?: number;
  }>;
}

export async function createErrand(fallbackCustomerId: number, input: CreateErrandInput) {
  const {
    customerId,
    category = "Pabili",
    description = "",
    pickupAddress = "Store",
    deliveryAddress = "Customer Address",
    estimatedCost = 0,
    tip = 0,
    pabiliItems = [],
  } = input;

  const finalCustomerId = customerId ? parseInt(String(customerId), 10) : fallbackCustomerId;
  const parsedEstimatedCost = parseFloat(String(estimatedCost));
  const parsedTip = parseFloat(String(tip));

  // Only compute pricing from RateConfig when the client didn't explicitly supply
  // deliveryFee/totalCost — client-supplied values are still honored unchanged.
  // Falls back to the previous hardcoded 80/80 if no RateConfig row exists yet.
  let deliveryFee = input.deliveryFee !== undefined ? parseFloat(String(input.deliveryFee)) : undefined;
  let totalCost = input.totalCost !== undefined ? parseFloat(String(input.totalCost)) : undefined;
  if (deliveryFee === undefined || totalCost === undefined) {
    const rateConfig = await rateConfigRepository.findFirst();
    const breakdown = rateConfig
      ? defaultPricingStrategy.calculate(parsedEstimatedCost, parsedTip, rateConfig)
      : { deliveryFee: 80, totalCost: parsedEstimatedCost + 80 + parsedTip };
    if (deliveryFee === undefined) deliveryFee = breakdown.deliveryFee;
    if (totalCost === undefined) totalCost = breakdown.totalCost;
  }

  const newErrand = await errandRepository.create({
    category,
    description,
    pickupAddress,
    deliveryAddress,
    deliveryLatitude: input.deliveryLatitude !== undefined ? parseFloat(String(input.deliveryLatitude)) : null,
    deliveryLongitude: input.deliveryLongitude !== undefined ? parseFloat(String(input.deliveryLongitude)) : null,
    estimatedCost: parsedEstimatedCost,
    deliveryFee,
    tip: parsedTip,
    totalCost,
    status: "AVAILABLE",
    customerId: finalCustomerId,
    pabiliDetails: {
      create: (pabiliItems || []).map((item) => ({
        itemName: item.itemName || item.name || "Item",
        quantity: parseInt(String(item.quantity || 1), 10),
        unitPrice: parseFloat(String(item.unitPrice || 0)),
        estimatedSubtotal: parseFloat(String(item.estimatedSubtotal || 0)),
      })),
    },
  });

  await customerTransactionRepository.create(finalCustomerId, newErrand.id, totalCost, input.paymentMethod || "COD");

  const errandWithNames = attachErrandNames(newErrand);
  eventPublisher.emit("order:new", errandWithNames);
  return errandWithNames;
}

export async function claimErrand(errandId: string, dispatcherId: number) {
  const errand = await errandRepository.findByIdWithDispatchLogs(errandId);
  if (!errand) {
    throw new ServiceError(404, "Errand not found");
  }

  if (errand.dispatchLogs.length > 0) {
    const existingLog = await dispatchLogRepository.findLatestByErrandId(errandId);

    // If already claimed by the SAME logged-in dispatcher, return success
    if (existingLog && existingLog.dispatcherId === dispatcherId) {
      const updatedErrand = await errandRepository.findById(errandId);
      return updatedErrand ? attachErrandNames(updatedErrand) : updatedErrand;
    }

    const claimantName = existingLog
      ? `${existingLog.dispatcher.firstName} ${existingLog.dispatcher.lastName}`.trim()
      : "another dispatcher";
    throw new ServiceError(409, `This order was already accepted by ${claimantName}`);
  }

  // Atomic guard: only proceeds if the errand is still AVAILABLE right now, closing
  // the race window between the read above and this write (two dispatchers claiming
  // the same errand at the same instant).
  const { count } = await errandRepository.claimIfAvailable(errandId);
  if (count === 0) {
    throw new ServiceError(409, "This order was already accepted by another dispatcher");
  }

  await dispatchLogRepository.create(errandId, dispatcherId);

  const updatedErrand = await errandRepository.findById(errandId);
  const errandWithNames = updatedErrand ? attachErrandNames(updatedErrand) : updatedErrand;
  eventPublisher.emit("order:claimed", errandWithNames);
  return errandWithNames;
}

export async function assignRider(errandId: string, riderId: number) {
  const errand = await errandRepository.findStatusAndRiderById(errandId);
  if (!errand) {
    throw new ServiceError(404, "Errand not found");
  }

  const rider = await userRepository.findById(riderId);
  if (!rider || rider.role !== "RIDER") {
    throw new ServiceError(400, "Selected user is not a valid rider.");
  }

  assertValidTransition(errand.status as unknown as ErrandStatusValue, "ASSIGNED");

  const updatedErrand = await errandRepository.update(errandId, {
    riderId,
    status: "ASSIGNED",
  });

  const errandWithNames = attachErrandNames(updatedErrand);
  eventPublisher.emit("order:updated", errandWithNames);

  // Fire-and-forget: a push failure must never fail the assignment request.
  void sendPushNotification(rider.expoPushToken, {
    title: "New Errand Assigned",
    body: `Errand #${updatedErrand.id.slice(0, 8)} — ${updatedErrand.pickupAddress}`,
    data: { errandId: updatedErrand.id, type: "errand_assigned" },
  });

  return errandWithNames;
}

// Rider declines an errand assigned to them: un-assigns the rider and returns the
// errand to PENDING (not AVAILABLE), so it stays in the claiming dispatcher's queue
// for immediate reassignment rather than releasing it to the shared unclaimed pool.
export async function declineErrand(errandId: string, riderId: number, _reason?: string) {
  const errand = await errandRepository.findStatusAndRiderById(errandId);
  if (!errand) {
    throw new ServiceError(404, "Errand not found");
  }

  if (errand.riderId !== riderId) {
    throw new ServiceError(403, "Access denied: You can only decline errands assigned to you.");
  }

  assertValidTransition(errand.status as unknown as ErrandStatusValue, "PENDING");

  const updatedErrand = await errandRepository.update(errandId, {
    riderId: null,
    status: "PENDING",
  });

  const errandWithNames = attachErrandNames(updatedErrand);
  eventPublisher.emit("order:updated", errandWithNames);
  return errandWithNames;
}

// Dispatcher sets/replaces the store pinpoints (waypoints) a rider must follow for
// this errand. Persisted as structured data (not just an ephemeral chat message) so
// both the rider's live map and any GIS routing have a single source of truth.
export async function savePinpoints(errandId: string, pins: PinpointInput[]) {
  const errand = await errandRepository.findByIdBasic(errandId);
  if (!errand) {
    throw new ServiceError(404, "Errand not found");
  }

  await pinpointRepository.replaceForErrand(errandId, pins);

  const updatedErrand = await errandRepository.findById(errandId);
  const errandWithNames = attachErrandNames(updatedErrand!);
  eventPublisher.emit("order:updated", errandWithNames);
  return errandWithNames;
}

// Rider accepts an errand the dispatcher assigned to them. Semantically distinct
// endpoint (rather than the generic status-update one) so the client has a single
// obvious "Accept Job" call — internally it's exactly the ASSIGNED -> IN_TRANSIT
// transition already defined in the state machine, restricted to the assigned rider.
export async function acceptErrand(errandId: string, riderId: number) {
  const errand = await errandRepository.findStatusAndRiderById(errandId);
  if (!errand) {
    throw new ServiceError(404, "Errand not found");
  }

  if (errand.riderId !== riderId) {
    throw new ServiceError(403, "Access denied: You can only accept errands assigned to you.");
  }

  assertValidTransition(errand.status as unknown as ErrandStatusValue, "IN_TRANSIT");

  const updatedErrand = await errandRepository.update(errandId, {
    status: "IN_TRANSIT",
  });

  const errandWithNames = attachErrandNames(updatedErrand);
  eventPublisher.emit("order:updated", errandWithNames);
  return errandWithNames;
}

export async function updateStatus(errandId: string, rawStatus: string, caller: { id: number; role: string }) {
  const normalized = normalizeStatus(rawStatus);

  const errand = await errandRepository.findStatusAndRiderById(errandId);
  if (!errand) {
    throw new ServiceError(404, "Errand not found");
  }

  // RIDER can only update status of errands assigned to them
  if (caller.role === "RIDER" && errand.riderId !== caller.id) {
    throw new ServiceError(403, "Access denied: You can only update status for errands assigned to you.");
  }

  assertValidTransition(errand.status as unknown as ErrandStatusValue, normalized);

  const updatedErrand = await errandRepository.update(errandId, {
    status: normalized,
  });

  const errandWithNames = attachErrandNames(updatedErrand);
  eventPublisher.emit("order:updated", errandWithNames);
  return errandWithNames;
}
