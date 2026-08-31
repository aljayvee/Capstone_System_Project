export type ErrandStatus =
  | "Available"
  | "AVAILABLE"
  | "Pending"
  | "PENDING"
  | "ACCEPTED"
  | "Assigned"
  | "Traveling"
  | "At Store"
  | "Purchased"
  | "In Route"
  | "Delivered"
  | "Completed"
  | "Cancelled"
  | "Disputed";

export interface ErrandPinpoint {
  id: number;
  storeName: string;
  latitude: number;
  longitude: number;
  sequence: number;
}

export interface ErrandItem {
  id?: number;
  errandId?: string;
  itemName: string;
  storeCategory?: string;
  quantity?: number;
  unitPrice?: number;
  estimatedSubtotal?: number;
  notes?: string;
}

export interface Errand {
  id: string;
  customerName: string;
  customerPhone: string;
  category: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  pinpoints?: ErrandPinpoint[];
  pabiliDetails?: ErrandItem[];
  pabiliItemRequests?: ErrandItem[];
  storeCount?: number;

  // Road-network route the fare was actually billed on, persisted by
  // errandService.recalculateFee. routeGeometry is an encoded polyline.
  distanceKm?: number | null;
  routeDistanceMeters?: number | null;
  routeDurationSeconds?: number | null;
  routeGeometry?: string | null;
  routeProvider?: string | null;

  // Estimated arrival as a RANGE, not a single time: most of an errand is the
  // rider standing in a shop, which varies far more than the ride. See the
  // server's etaStrategy.ts.
  etaLowAt?: string | null;
  etaHighAt?: string | null;
  etaComputedAt?: string | null;
  etaIsDegraded?: boolean;

  // Lifecycle timestamps.
  assignedAt?: string | null;
  acceptedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  estimatedCost: number;
  deliveryFee: number;
  tip: number;
  totalCost: number;
  status: ErrandStatus;
  dispatcherId?: number | string;
  dispatcherName?: string;
  dispatchLogs?: any[];
  riderId?: string;
  riderName?: string;
  createdAt: string;
  updatedAt: string;
}

// Strict legal state transitions matrix for anti-happy-path validation
const VALID_TRANSITIONS: Record<ErrandStatus, ErrandStatus[]> = {
  Available: ["Pending", "Cancelled"],
  AVAILABLE: ["PENDING", "Cancelled"],
  Pending: ["ACCEPTED", "Assigned", "Cancelled"],
  PENDING: ["ACCEPTED", "Assigned", "Cancelled"],
  ACCEPTED: ["Assigned", "Traveling", "Cancelled"],
  Assigned: ["Traveling", "Cancelled"],
  Traveling: ["At Store", "Cancelled"],
  "At Store": ["Purchased", "Cancelled"],
  Purchased: ["In Route", "Cancelled"],
  "In Route": ["Delivered", "Cancelled"],
  Delivered: ["Completed", "Disputed"],
  Completed: [],
  Cancelled: [],
  Disputed: ["Completed", "Cancelled"],
};

export function isValidErrandTransition(current: ErrandStatus, target: ErrandStatus): boolean {
  if (current === target) return true;
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(target);
}
